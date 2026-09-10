// dstucrypt-algos: combined algorithm object for jkurwa.
// Depends on the crypto zoo (gost89 + dstu7564 + dstu7624) and exposes algos()
// with a hashes map + kdf/cipher/storeload dispatchers.
'use strict';

const gost89 = require('gost89');
const dstu7564 = require('dstu7564');
const { KupynaMac } = require('./kmac');
const { storeload, storesave } = require('./storeload');

const hashes = {
  Gost34311: (data) => gost89.gosthash(data),
  Dstu4145le: (data) => gost89.gosthash(data),
  'Dstu7564-256': (data) => dstu7564.computeHash(32, data),
  'Dstu7564-384': (data) => dstu7564.computeHash(48, data),
  'Dstu7564-512': (data) => dstu7564.computeHash(64, data),
  Dstu4145leWithDstu7564: (data) => dstu7564.computeHash(32, data),
};
hashes['Dstu7564-256'].algo = 'Dstu7564-256';
hashes['Dstu7564-384'].algo = 'Dstu7564-384';
hashes['Dstu7564-512'].algo = 'Dstu7564-512';

function algos() {
  const base = gost89.compat.algos();
  return Object.assign({}, base, {
    hashes,
    hash: gost89.gosthash,
    storeload,
    storesave,
  });
}

module.exports = { algos, hashes, KupynaMac, storeload, storesave };
