// Store load/save dispatcher: format + kdf + enc.
// IIT format delegates to gost89; PBES2 dispatches on params.kdf / params.enc.
'use strict';

const gost89 = require('gost89');
const dstu7624 = require('dstu7624');
const { KupynaMac } = require('./kmac');

function kdfFor(params) {
  return {
    'Gost34311-hmac': (pw) => gost89.pbkdf(pw, params.salt, params.iters),
    'Dstu7564mac-256': (pw) => KupynaMac(pw, params.salt, params.iters, 32),
  }[params.kdf];
}

function decryptFor(params) {
  return {
    'Gost28147-cfb': (body, key) => gost89.compat.gost_decrypt_cfb(body, key, params.iv),
    'Dstu7624cbc-256': (body, key) => dstu7624.cbcDecrypt(key, params.iv, body),
  }[params.enc];
}

function encryptFor(params) {
  return {
    'Gost28147-cfb': (body, key) => gost89.compat.gost_encrypt_cfb(body, key, params.iv),
    'Dstu7624cbc-256': (body, key) => dstu7624.cbcEncrypt(key, params.iv, body),
  }[params.enc];
}

function storeload(params, password) {
  if (params.format === 'IIT') {
    return gost89.compat.decode_data(params, password);
  }
  const kdf = kdfFor(params);
  const dec = decryptFor(params);
  if (!kdf) throw new Error('No implementation provided for kdf: ' + params.kdf);
  if (!dec) throw new Error('No implementation provided for cipher: ' + params.enc);
  return dec(params.body, kdf(password));
}

function storesave(raw, params, password) {
  if (params.format === 'IIT') {
    throw new Error('IIT storesave not implemented');
  }
  const kdf = kdfFor(params);
  const enc = encryptFor(params);
  if (!kdf) throw new Error('No implementation provided for kdf: ' + params.kdf);
  if (!enc) throw new Error('No implementation provided for cipher: ' + params.enc);
  const body = enc(raw, kdf(password));
  return Object.assign({}, params, { body });
}

module.exports = { storeload, storesave, kdfFor, decryptFor, encryptFor };
