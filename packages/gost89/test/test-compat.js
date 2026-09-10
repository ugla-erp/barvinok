import assert from "node:assert";
import Gost from "../lib/gost89.js";
import * as dstu from "../lib/dstu.js";
import * as compat from "../lib/compat.js";

describe("compat", function () {
  describe("decode_data() / storeload", { timeout: 20000 }, function () {
    // These tests run the hand-rolled JS hash function through a real
    // PBKDF (1000-10000 iterations, some doubled up via encode+decode).
    // That is legitimately slow - "add PBKDF (slow as hell)" is the
    // actual upstream commit message - and cold-JIT/CPU contention can
    // push a single run past the runner's default, so give this block
    // more headroom rather than risk a flaky timeout.
    //
    // Was `this.timeout(20000)` under mocha, which vitest has no equivalent for: the runner takes
    // the budget as an option on the block instead of as a call inside it.

    it("should decrypt a PBES2 body using the sbox declared by the container", function () {
      var pw = "password";
      var salt = Buffer.from(
        "31a58dc1462981189cf6c701e276c7553a5ab5f6e36d8418e4aa40c930cf3876",
        "hex",
      );
      var iv = Buffer.from("F1F2F3F4F5F6F7F8", "hex");
      var iters = 1000;
      var plain = Buffer.from("KURWA VODKA MATRIOSKA, NON-DEFAULT SBOX EDITION", "binary");

      // A deliberately non-default substitution table: the library's default
      // DKU table with its 128 entries reversed. Every entry is still a
      // valid 0-15 nibble value, it is simply a different table.
      var permutedSbox = Buffer.from(dstu.defaultSbox).reverse();
      assert.notDeepEqual(permutedSbox, dstu.defaultSbox);

      // Build the fixture with the library's own primitives: derive the key
      // exactly as convert_password() would, then encrypt with a context
      // keyed to the permuted table. (encode_data() can't be reused here -
      // it always hardcodes dstu.defaultSbox, see the bug this is testing.)
      var bkey = compat.convert_password({ format: "PBES2", salt: salt, iters: iters }, pw);
      var encryptCtx = Gost.init(permutedSbox);
      encryptCtx.key(bkey);
      var body = Buffer.alloc(plain.length);
      encryptCtx.crypt_cfb(Buffer.from(iv), plain, body);

      // This is what a PBES2 parser (jkurwa's lib/spec/pbes.js) hands to
      // decode_data: the packed 64-byte form of the table under `sbox`.
      var parsed = {
        format: "PBES2",
        body: body,
        iv: Buffer.from(iv),
        salt: salt,
        iters: iters,
        sbox: dstu.packSbox(permutedSbox),
      };

      var decoded = compat.decode_data(parsed, pw);
      assert.equal(decoded.toString("binary"), plain.toString("binary"));

      // Prove the table actually matters: decrypting the very same
      // ciphertext with the *default* table - i.e. exactly what decode_data
      // did before it honoured parsed.sbox - must NOT recover the plaintext.
      var defaultCtx = Gost.init();
      defaultCtx.key(bkey);
      var wrongDecoded = Buffer.alloc(body.length);
      defaultCtx.decrypt_cfb(Buffer.from(iv), body, wrongDecoded);
      assert.notEqual(wrongDecoded.toString("binary"), plain.toString("binary"));
    });

    it("should keep decrypting containers with no declared sbox exactly as before (default table)", function () {
      var pw = "password";
      var salt = Buffer.from(
        "31a58dc1462981189cf6c701e276c7553a5ab5f6e36d8418e4aa40c930cf3876",
        "hex",
      );
      var iv = Buffer.from("F1F2F3F4F5F6F7F8", "hex");
      var iters = 1000;
      var plain = Buffer.from("no sbox declared, must fall back to default", "binary");

      var bkey = compat.convert_password({ format: "PBES2", salt: salt, iters: iters }, pw);
      var ctx = Gost.init(); // default table, same as decode_data's old unconditional call
      ctx.key(bkey);
      var body = Buffer.alloc(plain.length);
      ctx.crypt_cfb(Buffer.from(iv), plain, body);

      var parsed = {
        format: "PBES2",
        body: body,
        iv: Buffer.from(iv),
        salt: salt,
        iters: iters,
        // no `sbox` key at all - simulates an older/foreign container
      };

      var decoded = compat.decode_data(parsed, pw);
      assert.equal(decoded.toString("binary"), plain.toString("binary"));
    });

    it("should round-trip through algos().storesave()/storeload() unchanged (regression guard)", function () {
      // encode_data isn't exported directly; algos() is the actual public
      // surface consumers (e.g. jkurwa) use.
      var algos = compat.algos();
      var pw = "password";
      var salt = Buffer.from(
        "31a58dc1462981189cf6c701e276c7553a5ab5f6e36d8418e4aa40c930cf3876",
        "hex",
      );
      var iv = Buffer.from("F1F2F3F4F5F6F7F8", "hex");
      var plain = Buffer.from("round trip through the public helpers", "binary");

      var encoded = algos.storesave(plain, "PBES2", pw, Buffer.from(iv), salt);
      var decoded = algos.storeload(encoded, pw);

      assert.equal(decoded.toString("binary"), plain.toString("binary"));
    });
  });
});
