import { Buffer } from "buffer";

import * as keywrap from "./keywrap.js";
import * as util from "./util.js";
import Gost from "./gost89.js";
import Hash from "./hash.js";
import * as dstu from "./dstu.js";

var convert_password = function (parsed, pw) {
  if (parsed.format === "IIT") {
    return util.dumb_kdf(pw, 10000);
  }
  if (parsed.format === "PBES2") {
    return util.pbkdf(pw, parsed.salt, parsed.iters);
  }

  throw new Error("Failed to convert key");
};

var decode_data = function (parsed, pw) {
  var bkey;

  // The container may declare which substitution table (ДКЕ) it was
  // encrypted with (parsed.sbox, packed 64-byte form). Honour it when
  // present; fall back to Gost's default table otherwise, exactly as
  // before.
  var sbox = parsed.sbox ? dstu.unpackSbox(parsed.sbox) : undefined;
  var ctx = Gost.init(sbox);
  var buf, obuf;
  bkey = convert_password(parsed, pw, true);
  ctx.key(bkey);

  if (parsed.format === "IIT") {
    buf = Buffer.concat([parsed.body, parsed.pad]);
    obuf = Buffer.alloc(buf.length);
    ctx.decrypt(buf, obuf);
    return obuf.slice(0, parsed.body.length);
  }
  if (parsed.format === "PBES2") {
    buf = parsed.body;
    obuf = Buffer.alloc(buf.length);
    ctx.decrypt_cfb(parsed.iv, buf, obuf);
    return obuf;
  }
};

var encode_data = function (raw, format, pw, iv, salt) {
  const ctx = Gost.init();
  if (format === "PBES2") {
    const iters = 10000;
    const sbox = dstu.packSbox(dstu.defaultSbox);
    const bkey = convert_password({ iters, salt, format }, pw, true);
    ctx.key(bkey);
    const obuf = Buffer.alloc(raw.length);
    ctx.crypt_cfb(iv, raw, obuf);
    return { format, iv, salt, iters, body: obuf, sbox };
  }
};

var compute_hash = function (contents) {
  return Hash.gosthash(contents);
};

var gost_unwrap = function (kek, inp) {
  return keywrap.unwrap(inp, kek);
};

var gost_keywrap = function (kek, inp, iv) {
  return keywrap.wrap(inp, kek, iv);
};

var gost_kdf = function (buffer) {
  return compute_hash(buffer);
};

var gost_crypt = function (mode, inp, key, iv) {
  var ctx = Gost.init();
  ctx.key(key);
  if (mode) {
    return ctx.decrypt_cfb(iv, inp);
  } else {
    return ctx.crypt_cfb(iv, inp);
  }
};

var gost_decrypt_cfb = function (cypher, key, iv) {
  return gost_crypt(1, cypher, key, iv);
};

var gost_encrypt_cfb = function (cypher, key, iv) {
  return gost_crypt(0, cypher, key, iv);
};

// `encode_data` is deliberately not exported by name: it never was, and it is reachable only as
// `algos().storesave`. Its signature disagrees with the `storesave(raw, params, password)` that
// barvinok-algos declares, which is a real defect and a separate change — widening the export
// surface here would only spread it.
export {
  decode_data,
  convert_password,
  compute_hash,
  gost_kdf,
  gost_unwrap,
  gost_keywrap,
  gost_decrypt_cfb,
  gost_encrypt_cfb,
};

export function algos() {
  return {
    kdf: gost_kdf,
    keywrap: gost_keywrap,
    keyunwrap: gost_unwrap,
    encrypt: gost_encrypt_cfb,
    decrypt: gost_decrypt_cfb,
    hash: compute_hash,
    storeload: decode_data,
    storesave: encode_data,
  };
}
