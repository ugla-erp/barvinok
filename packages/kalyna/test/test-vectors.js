const { encryptBlock, decryptBlock, cbcEncrypt, cbcDecrypt, keySchedule, reverseRkeys } = require('../dstu7624');

function hex(s) { return Buffer.from(s, 'hex'); }
function check(name, got, exp) {
  const ok = Buffer.isBuffer(exp) ? got.equals(exp) : got.toString('hex') === exp.toLowerCase();
  console.log((ok ? 'PASS' : 'FAIL'), name, ok ? '' : `\n  got ${got.toString('hex')}\n  exp ${Buffer.isBuffer(exp) ? exp.toString('hex') : exp.toLowerCase()}`);
  return ok;
}
function iso7816pad(data, blockSize) {
  const pad = blockSize - (data.length % blockSize);
  const p = Buffer.alloc(pad);
  p[0] = 0x80;
  return Buffer.concat([data, p]);
}
let all = true;

// ---- ECB 32/32 (block 256, key 256) — the Dstu7624cbc-256 case ----
const key256 = hex('000102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F');
const pt256 = hex('202122232425262728292A2B2C2D2E2F303132333435363738393A3B3C3D3E3F');
const ct256 = hex('F66E3D570EC92135AEDAE323DCBD2A8CA03963EC206A0D5A88385C24617FD92C');
{
  const rkeys = keySchedule(key256);
  all &= check('ECB 32/32 encrypt', encryptBlock(rkeys, pt256), ct256);
  all &= check('ECB 32/32 decrypt (known vector)', decryptBlock(reverseRkeys(rkeys), ct256), pt256);
}

// ---- CBC 32/32 (key 256, iv 256, ISO 7816-4 padded 82-byte data -> 96 bytes) ----
const keyCbc = hex('000102030405060708090A0B0C0D0E0F000102030405060708090A0B0C0D0E0F');
const ivCbc = hex('101112131415161718191A1B1C1D1E1F101112131415161718191A1B1C1D1E1F');
const ctCbc = hex('0ae0780c2eaf54065d181e5339fc94a50dbeca17069769e5c23cdc7bdad6adfcd93e59097469be420c164d90aae17ec0dc8e9b11412e5b3c812fbb0204313abe0d5b0adfb5187be6868f6bfddc096ffa1a5294cc90b49605b7f3cc3532d4604c');
{
  const data = hex('202122232425262728292A2B2C2D2E2F303132333435363738393A3B3C3D3E3F404142434445464748' +
                   '202122232425262728292A2B2C2D2E2F303132333435363738393A3B3C3D3E3F404142434445464748');
  const padded = iso7816pad(data, 32);
  all &= check('CBC 32/32 encrypt', cbcEncrypt(keyCbc, ivCbc, padded), ctCbc);
  all &= check('CBC 32/32 decrypt (known vector)', cbcDecrypt(keyCbc, ivCbc, ctCbc), padded);
}

// ---- payload sizes crossing 1..8 blocks, varied content ----
{
  const iv = Buffer.alloc(32);
  for (const blocks of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const data = Buffer.alloc(32 * blocks);
    for (let i = 0; i < data.length; i++) data[i] = (i * 7 + blocks * 13) & 0xff; // varied, not just zeros
    const enc = cbcEncrypt(keyCbc, iv, data);
    const dec = cbcDecrypt(keyCbc, iv, enc);
    all &= check(`CBC ${blocks} block(s) roundtrip`, dec, data);
  }
}

// ---- non-multiple-of-block input must throw ----
{
  let threw = false;
  try { cbcEncrypt(keyCbc, ivCbc, Buffer.alloc(33)); } catch (e) { threw = true; }
  console.log((threw ? 'PASS' : 'FAIL'), 'CBC rejects non-multiple input');
  all &= threw;
  let threw2 = false;
  try { cbcDecrypt(keyCbc, ivCbc, Buffer.alloc(1)); } catch (e) { threw2 = true; }
  console.log((threw2 ? 'PASS' : 'FAIL'), 'CBC decrypt rejects non-multiple input');
  all &= threw2;
}

// ---- empty input ----
{
  all &= check('CBC empty roundtrip', cbcDecrypt(keyCbc, ivCbc, cbcEncrypt(keyCbc, ivCbc, Buffer.alloc(0))), Buffer.alloc(0));
}

// ---- zip-lock: two key schedules interleaved must not leak into each other ----
{
  const rA = keySchedule(key256);   // key256's ECB vector is a known-good reference
  const rB = keySchedule(keyCbc);
  const msgs = [pt256, Buffer.alloc(32, 0x02), Buffer.alloc(32, 0x03)];

  const soloA = msgs.map((m) => encryptBlock(rA, m));
  const soloB = msgs.map((m) => encryptBlock(rB, m));
  all &= check('zip-lock keyA vector', soloA[0], ct256); // wire to the known vector

  const zipA = [], zipB = [];
  for (let i = 0; i < msgs.length; i++) {
    zipA.push(encryptBlock(rA, msgs[i]));
    zipB.push(encryptBlock(rB, msgs[i]));
  }
  for (let i = 0; i < msgs.length; i++) {
    all &= check(`zip-lock ECB keyA[${i}]`, zipA[i], soloA[i]);
    all &= check(`zip-lock ECB keyB[${i}]`, zipB[i], soloB[i]);
  }
}

console.log(all ? '\nALL PASS' : '\nSOME FAIL');
process.exit(all ? 0 : 1);
