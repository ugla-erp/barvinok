// Kalyna (DSTU 7624:2014) block cipher, ported from cryptonite src/cryptonite/c/dstu7624.c.
// Currently implements Kalyna-256 (block 32 bytes, key 32 bytes) — the Dstu7624cbc-256 case.
'use strict';

const { sbox, sboxRev, mds, mdsRev } = require('./constants');

const MASK64 = 0xFFFFFFFFFFFFFFFFn;
const REDUCTION_POLYNOMIAL = 0x11d;

function multiplyGalua(x, y) {
  let r = 0;
  for (let i = 0; i < 8; i++) {
    if (y & 1) r ^= x;
    const hbit = x & 0x80;
    x = (x << 1) & 0xff;
    if (hbit) x = (x ^ REDUCTION_POLYNOMIAL) & 0xff;
    y >>= 1;
  }
  return r;
}

function buildTable(sb, matrix) {
  const T = [];
  for (let k = 0; k < 8; k++) {
    T[k] = new Array(256);
    for (let i = 0; i < 256; i++) {
      let v = 0n;
      for (let j = 0; j < 8; j++) {
        const m = multiplyGalua(matrix[j * 8 + k], sb[((k % 4) * 256) + i]);
        v ^= BigInt(m) << BigInt(j * 8);
      }
      T[k][i] = v;
    }
  }
  return T;
}

const pBoxrowcol = buildTable(sbox, mds);       // forward MixColumns
const pBoxrowcolRev = buildTable(sboxRev, mdsRev); // inverse MixColumns

function byteOf(w, b) {
  return Number((w >> BigInt(b * 8)) & 0xffn);
}

function bytesToWords(buf) {
  const words = [];
  for (let i = 0; i < buf.length; i += 8) {
    let w = 0n;
    for (let j = 0; j < 8; j++) w ^= BigInt(buf[i + j]) << BigInt(j * 8);
    words.push(w);
  }
  return words;
}

function wordsToBytes(words, len) {
  const buf = Buffer.alloc(len);
  for (let i = 0; i < words.length; i++) {
    for (let j = 0; j < 8; j++) buf[i * 8 + j] = Number((words[i] >> BigInt(j * 8)) & 0xffn);
  }
  return buf;
}

// SubBytes + ShiftRows + MixColumns (forward), state of 4 x uint64.
// Equivalent to C subrowcol256 = kalina_G256(T, s, 0,0,3,3,2,2,1,1).
function mix256(s) {
  const s0 = s[0], s1 = s[1], s2 = s[2], s3 = s[3];
  const T = pBoxrowcol;
  const o = new Array(4);
  o[0] = T[0][byteOf(s0, 0)] ^ T[1][byteOf(s0, 1)] ^ T[2][byteOf(s3, 2)] ^ T[3][byteOf(s3, 3)] ^
         T[4][byteOf(s2, 4)] ^ T[5][byteOf(s2, 5)] ^ T[6][byteOf(s1, 6)] ^ T[7][byteOf(s1, 7)];
  o[1] = T[0][byteOf(s1, 0)] ^ T[1][byteOf(s1, 1)] ^ T[2][byteOf(s0, 2)] ^ T[3][byteOf(s0, 3)] ^
         T[4][byteOf(s3, 4)] ^ T[5][byteOf(s3, 5)] ^ T[6][byteOf(s2, 6)] ^ T[7][byteOf(s2, 7)];
  o[2] = T[0][byteOf(s2, 0)] ^ T[1][byteOf(s2, 1)] ^ T[2][byteOf(s1, 2)] ^ T[3][byteOf(s1, 3)] ^
         T[4][byteOf(s0, 4)] ^ T[5][byteOf(s0, 5)] ^ T[6][byteOf(s3, 6)] ^ T[7][byteOf(s3, 7)];
  o[3] = T[0][byteOf(s3, 0)] ^ T[1][byteOf(s3, 1)] ^ T[2][byteOf(s2, 2)] ^ T[3][byteOf(s2, 3)] ^
         T[4][byteOf(s1, 4)] ^ T[5][byteOf(s1, 5)] ^ T[6][byteOf(s0, 6)] ^ T[7][byteOf(s0, 7)];
  return o;
}

function addWords(a, b) {
  const o = new Array(4);
  for (let k = 0; k < 4; k++) o[k] = (a[k] + b[k]) & MASK64;
  return o;
}

function subWords(a, b) {
  const o = new Array(4);
  for (let k = 0; k < 4; k++) o[k] = (a[k] - b[k]) & MASK64;
  return o;
}

// Key schedule for Kalyna-256/256 (block 32, key 32, rounds 14).
function keySchedule(key) {
  const rounds = 14;
  const keyWords = bytesToWords(key); // 4 words

  // p_help_round_key (block_len == key_len branch)
  let hrkey = [0x09n, 0n, 0n, 0n];
  hrkey = addWords(hrkey, keyWords);            // 1. hrkey += key
  hrkey = xorWords(mix256(hrkey), keyWords);    // 2. hrkey = mix(hrkey) ^ key
  hrkey = addWords(mix256(hrkey), keyWords);    // 3. hrkey = mix(hrkey) + key
  hrkey = mix256(hrkey);                        // 4. hrkey = mix(hrkey)

  // key shifts: for block==key, shift = 56*i bytes, i = 0..rounds/2
  const keyShifts = [];
  for (let i = 0; i <= rounds >> 1; i++) {
    const shift = 56 * i;
    const buf = Buffer.alloc(32);
    for (let j = 0; j < 32; j++) buf[(j + shift) % 32] = key[j];
    keyShifts.push(...bytesToWords(buf));
  }

  const rkeys = new Array(15 * 4); // 15 round keys x 4 words
  for (let i = 0; i <= rounds >> 1; i++) {
    const base = i * 8; // round key (2*i) lives at offset 2*i*4 = i*8
    const idWord = BigInt(1 << i) * 0x0001000100010001n;
    for (let k = 0; k < 4; k++) rkeys[base + k] = (hrkey[k] + idWord) & MASK64;
    const snap = rkeys.slice(base, base + 4);
    for (let k = 0; k < 4; k++) rkeys[base + k] = (rkeys[base + k] + keyShifts[i * 4 + k]) & MASK64;
    let v = mix256(rkeys.slice(base, base + 4));
    for (let k = 0; k < 4; k++) v[k] ^= snap[k];       // sub_shift_mix_xor
    v = mix256(v);
    for (let k = 0; k < 4; k++) v[k] = (v[k] + snap[k]) & MASK64; // sub_shift_mix_add
    for (let k = 0; k < 4; k++) rkeys[base + k] = v[k];
  }

  // odd round keys: byte-rotate even key left by (block_len - block_len/4 - 3)
  const shift = 32 - (32 / 4 + 3); // 21
  for (let r = 0; r < rounds; r += 2) {
    const evenBytes = wordsToBytes(rkeys.slice(r * 4, r * 4 + 4), 32);
    const rot = Buffer.alloc(32);
    for (let j = 0; j < 32; j++) rot[(j + shift) % 32] = evenBytes[j];
    const odd = bytesToWords(rot);
    for (let k = 0; k < 4; k++) rkeys[(r + 1) * 4 + k] = odd[k];
  }
  return rkeys;
}

function xorWords(a, b) {
  const o = new Array(4);
  for (let k = 0; k < 4; k++) o[k] = a[k] ^ b[k];
  return o;
}

function encryptBlock(rkeys, input) {
  let state = bytesToWords(input);
  for (let k = 0; k < 4; k++) state[k] = (state[k] + rkeys[k]) & MASK64; // round key 0
  for (let r = 1; r <= 13; r++) {
    const m = mix256(state);
    const o = new Array(4);
    for (let k = 0; k < 4; k++) o[k] = m[k] ^ rkeys[r * 4 + k];
    state = o;
  }
  const m = mix256(state);
  const o = new Array(4);
  for (let k = 0; k < 4; k++) o[k] = (m[k] + rkeys[14 * 4 + k]) & MASK64; // round key 14 (add)
  return wordsToBytes(o, 32);
}

// invert_state: inverse MixColumns using forward sbox + inverse table (in-place on words).
function invertState(s) {
  const T = pBoxrowcolRev;
  const o = new Array(4);
  for (let k = 0; k < 4; k++) {
    let v = 0n;
    for (let b = 0; b < 8; b++) {
      v ^= T[b][sbox[(b % 4) * 256 + byteOf(s[k], b)]];
    }
    o[k] = v;
  }
  return o;
}

// reverse_rkey for 256/256: invert round keys 1..13 (offsets 52..4), skip 0 and 14.
function reverseRkeys(rkeys) {
  const rev = rkeys.slice();
  for (let off = 52; off >= 4; off -= 4) {
    const inv = invertState(rev.slice(off, off + 4));
    for (let k = 0; k < 4; k++) rev[off + k] = inv[k];
  }
  return rev;
}

// inv_subrowcol_xor256 (inverse round, XOR with reversed round key).
function invXorRound(s, rkey) {
  const s0 = s[0], s1 = s[1], s2 = s[2], s3 = s[3];
  const T = pBoxrowcolRev;
  const o = new Array(4);
  o[0] = rkey[0] ^ T[0][byteOf(s0, 0)] ^ T[1][byteOf(s0, 1)] ^ T[2][byteOf(s1, 2)] ^ T[3][byteOf(s1, 3)] ^
         T[4][byteOf(s2, 4)] ^ T[5][byteOf(s2, 5)] ^ T[6][byteOf(s3, 6)] ^ T[7][byteOf(s3, 7)];
  o[1] = rkey[1] ^ T[0][byteOf(s1, 0)] ^ T[1][byteOf(s1, 1)] ^ T[2][byteOf(s2, 2)] ^ T[3][byteOf(s2, 3)] ^
         T[4][byteOf(s3, 4)] ^ T[5][byteOf(s3, 5)] ^ T[6][byteOf(s0, 6)] ^ T[7][byteOf(s0, 7)];
  o[2] = rkey[2] ^ T[0][byteOf(s2, 0)] ^ T[1][byteOf(s2, 1)] ^ T[2][byteOf(s3, 2)] ^ T[3][byteOf(s3, 3)] ^
         T[4][byteOf(s0, 4)] ^ T[5][byteOf(s0, 5)] ^ T[6][byteOf(s1, 6)] ^ T[7][byteOf(s1, 7)];
  o[3] = rkey[3] ^ T[0][byteOf(s3, 0)] ^ T[1][byteOf(s3, 1)] ^ T[2][byteOf(s0, 2)] ^ T[3][byteOf(s0, 3)] ^
         T[4][byteOf(s1, 4)] ^ T[5][byteOf(s1, 5)] ^ T[6][byteOf(s2, 6)] ^ T[7][byteOf(s2, 7)];
  return o;
}

// inv_subrowcol_sub: inverse SubBytes (no MixColumns), subtract round key 0.
function invSubCombine(w0, w1, w2, w3) {
  let v = 0n;
  v ^= BigInt(sboxRev[byteOf(w0, 0)]);
  v ^= BigInt(sboxRev[256 + byteOf(w0, 1)]) << 8n;
  v ^= BigInt(sboxRev[512 + byteOf(w1, 2)]) << 16n;
  v ^= BigInt(sboxRev[768 + byteOf(w1, 3)]) << 24n;
  v ^= BigInt(sboxRev[byteOf(w2, 4)]) << 32n;
  v ^= BigInt(sboxRev[256 + byteOf(w2, 5)]) << 40n;
  v ^= BigInt(sboxRev[512 + byteOf(w3, 6)]) << 48n;
  v ^= BigInt(sboxRev[768 + byteOf(w3, 7)]) << 56n;
  return v;
}

function invSub(s, rkey) {
  const s0 = s[0], s1 = s[1], s2 = s[2], s3 = s[3];
  const o = new Array(4);
  o[0] = (invSubCombine(s0, s1, s2, s3) - rkey[0]) & MASK64;
  o[1] = (invSubCombine(s1, s2, s3, s0) - rkey[1]) & MASK64;
  o[2] = (invSubCombine(s2, s3, s0, s1) - rkey[2]) & MASK64;
  o[3] = (invSubCombine(s3, s0, s1, s2) - rkey[3]) & MASK64;
  return o;
}

function decryptBlock(rkeysRev, input) {
  let state = bytesToWords(input);
  for (let k = 0; k < 4; k++) state[k] = (state[k] - rkeysRev[56 + k]) & MASK64; // round key 14
  state = invertState(state);
  for (let off = 52; off >= 4; off -= 4) {
    state = invXorRound(state, rkeysRev.slice(off, off + 4));
  }
  state = invSub(state, rkeysRev.slice(0, 4));
  return wordsToBytes(state, 32);
}

function cbcEncrypt(key, iv, data) {
  if (data.length % 32 !== 0) throw new Error('CBC input must be a multiple of 32 bytes, got ' + data.length);
  const rkeys = keySchedule(key);
  let prev = iv;
  const out = Buffer.alloc(data.length);
  for (let off = 0; off < data.length; off += 32) {
    const block = data.subarray(off, off + 32);
    const xored = Buffer.alloc(32);
    for (let i = 0; i < 32; i++) xored[i] = block[i] ^ prev[i];
    const enc = encryptBlock(rkeys, xored);
    enc.copy(out, off);
    prev = enc;
  }
  return out;
}

function cbcDecrypt(key, iv, data) {
  if (data.length % 32 !== 0) throw new Error('CBC input must be a multiple of 32 bytes, got ' + data.length);
  const rkeys = keySchedule(key);
  const rkeysRev = reverseRkeys(rkeys);
  let prev = iv;
  const out = Buffer.alloc(data.length);
  for (let off = 0; off < data.length; off += 32) {
    const block = data.subarray(off, off + 32);
    const dec = decryptBlock(rkeysRev, block);
    const plain = Buffer.alloc(32);
    for (let i = 0; i < 32; i++) plain[i] = dec[i] ^ prev[i];
    plain.copy(out, off);
    prev = block;
  }
  return out;
}

module.exports = {
  keySchedule,
  encryptBlock,
  decryptBlock,
  cbcEncrypt,
  cbcDecrypt,
  reverseRkeys,
};
