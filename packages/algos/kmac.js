// Dstu7564mac-256 KDF: PBKDF2 with KMAC as PRF, password null-padded to the hash size.
// Uses dstu7564's keyed KMAC (dstu7564_kmac) so PAD(K) is digested once, not per iteration.
'use strict';

const { dstu7564_kmac } = require('dstu7564');

function KupynaMac(password, salt, iters, bitMode) {
  const key = Buffer.alloc(bitMode);
  Buffer.from(password).copy(key);
  const counter = Buffer.from([0, 0, 0, 1]);

  const kmac = dstu7564_kmac(key, bitMode);
  let U = kmac.compute(Buffer.concat([salt, counter]));
  const result = Buffer.from(U);
  for (let j = 1; j < iters; j++) {
    U = kmac.compute(U);
    for (let i = 0; i < bitMode; i++) result[i] ^= U[i];
  }
  return result;
}

module.exports = { KupynaMac };
