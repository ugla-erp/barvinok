const gost89 = require('gost89');
const { KupynaMac, hashes, storeload, storesave } = require('../index');
const { computeKmac } = require('dstu7564');
const dstu7624 = require('dstu7624');

function hex(s) { return Buffer.from(s, 'hex'); }
function check(name, got, exp) {
  const ok = Buffer.isBuffer(exp) ? got.equals(exp) : got.toString('hex') === exp.toLowerCase();
  console.log((ok ? 'PASS' : 'FAIL'), name, ok ? '' : `\n  got ${got.toString('hex')}\n  exp ${Buffer.isBuffer(exp) ? exp.toString('hex') : exp.toLowerCase()}`);
  return ok;
}
let all = true;

const salt = hex('7b435919fec0c63d1e03f7ac21c8d62a20287a0b0c2d64f2e1bd87b0b9c1b7f7');
const iv32 = hex('101112131415161718191A1B1C1D1E1F101112131415161718191A1B1C1D1E1F');
const key32 = Buffer.alloc(32); Buffer.from('12345').copy(key32);

// KMAC one iteration (matches ~/puzzle/k)
{
  const mac = computeKmac(key32, Buffer.concat([salt, Buffer.from([0,0,0,1])]), 32);
  all &= check('KMAC 1 iter', mac, 'eb18552bed47779661ac1b2a2e7d00e0975c123f2d5af3647a8311ee042ac810');
}

// KupynaMac full KDF (10000 iters) — regression against the dstu7564 1.0.1 padding bug
{
  const key = KupynaMac('12345', salt, 10000, 32);
  all &= check('KupynaMac 10000 iters', key, '84c90a0d0e380e4261462b3def89d05fa6fad25697a2bd6dc45e1c749868d9a8');
}

// KDF edge cases
{
  // iters=1 must equal a single KMAC call
  const one = KupynaMac('12345', salt, 1, 32);
  all &= check('KupynaMac iters=1 == KMAC', one, computeKmac(key32, Buffer.concat([salt, Buffer.from([0,0,0,1])]), 32));
  // password >32 bytes truncates to 32 (documented dstu7564mac-256 behavior)
  const long = KupynaMac('1234567890abcdef1234567890abcdef12345678', salt, 2, 32);
  const short = KupynaMac('1234567890abcdef1234567890abcdef', salt, 2, 32);
  all &= check('KupynaMac password truncation', long, short);
  // empty password still yields a key
  const empty = KupynaMac('', salt, 2, 32);
  const emptyOk = Buffer.isBuffer(empty) && empty.length === 32;
  all &= emptyOk;
  console.log((emptyOk ? 'PASS' : 'FAIL'), 'KupynaMac empty password len');
}

// storeload roundtrip: KupynaMac KDF + Kalyna CBC
{
  const plaintext = Buffer.alloc(64); Buffer.from('hello kupyna store').copy(plaintext);
  const params = { format: 'PBES2', kdf: 'Dstu7564mac-256', enc: 'Dstu7624cbc-256', salt, iters: 2, iv: iv32 };
  const saved = storesave(plaintext, params, '12345');
  all &= check('storesave Kupyna CBC encrypt', saved.body, dstu7624.cbcEncrypt(KupynaMac('12345', salt, 2, 32), iv32, plaintext));
  const out = storeload(saved, '12345');
  all &= check('storeload Kupyna CBC decrypt', out, plaintext);
}

// storeload GOST path: Gost34311-hmac + Gost28147-cfb
{
  const iv8 = hex('1011121314151617');
  const plaintext = Buffer.from('gost path roundtrip, not block aligned', 'ascii');
  const gkey = gost89.pbkdf('12345', salt, 2);
  const body = gost89.compat.gost_encrypt_cfb(plaintext, gkey, iv8);
  const params = { format: 'PBES2', kdf: 'Gost34311-hmac', enc: 'Gost28147-cfb', salt, iters: 2, iv: iv8, body };
  const out = storeload(params, '12345');
  all &= check('storeload GOST CFB decrypt', out, plaintext);
}

// hashes map smoke
{
  const gh = hashes.Gost34311(Buffer.from('a'));
  all &= (gh.length === 32);
  console.log((gh.length === 32 ? 'PASS' : 'FAIL'), 'Gost34311 hash len 32');
  const h = hashes['Dstu7564-256'](Buffer.from('abc'));
  all &= (h.length === 32);
  console.log((h.length === 32 ? 'PASS' : 'FAIL'), 'Dstu7564-256 hash len 32');
}

console.log(all ? '\nALL PASS' : '\nSOME FAIL');
process.exit(all ? 0 : 1);
