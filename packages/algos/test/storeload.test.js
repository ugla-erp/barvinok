import { init, pbkdf } from "@ugla/barvinok-gost89";
import { unpackSbox } from "@ugla/barvinok-gost89/lib/dstu.js";
import { storeload } from "../index.js";

// A PBES2 store exactly as barvinok's spec/pbes.js returns one: no `kdf`, no `enc`, because no
// parser in the tree emits either.
function pbes2Store(plain, password, sbox = null) {
  const salt = Buffer.alloc(32, 0x11);
  const iv = Buffer.from("0011223344556677", "hex");

  const ctx = init(sbox ? unpackSbox(sbox) : undefined);
  ctx.key(pbkdf(password, salt, 10000));
  const body = Buffer.alloc(plain.length);
  ctx.crypt_cfb(iv, plain, body);

  const store = { format: "PBES2", iv, salt, iters: 10000, body };
  if (sbox) store.sbox = sbox;
  return store;
}

describe("storeload", () => {
  const password = "correct horse";
  const plain = Buffer.from("a private key would live here...", "utf8");
  const sbox = Buffer.alloc(64, 0x42);

  it("decrypts a PBES2 store carrying no explicit kdf or enc", () => {
    expect(storeload(pbes2Store(plain, password), password)).toEqual(plain);
  });

  it("honours the substitution table the container declares", () => {
    expect(storeload(pbes2Store(plain, password, sbox), password)).toEqual(plain);
  });

  it("the substitution table actually changes the ciphertext", () => {
    expect(pbes2Store(plain, password, sbox).body).not.toEqual(pbes2Store(plain, password).body);
  });
});
