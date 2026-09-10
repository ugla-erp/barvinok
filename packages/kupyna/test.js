import { computeHash, computeKmac, dstu7564_kmac } from "./dstu7564.js";

function main2() {
  const buffer = Buffer.from(
    "000102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F202122232425262728292A2B2C2D2E2F303132333435363738393A3B3C3D3E3F",
    "hex",
  );
  const expected = Buffer.from(
    "08F4EE6F1BE6903B324C4E27990CB24EF69DD58DBE84813EE0A52F6631239875",
    "hex",
  );
  const hash = computeHash(32, buffer);

  console.log("got", hash);
  console.log("expected", expected);
  expect(hash.equals(expected)).toBe(true);
}

function main3() {
  const buffer = Buffer.alloc(0);
  const expected = Buffer.from(
    "656b2f4cd71462388b64a37043ea55dbe445d452aecd46c3298343314ef04019bcfa3f04265a9857f91be91fce197096187ceda78c9c1c021c294a0689198538",
    "hex",
  );
  const hash = computeHash(64, buffer);

  console.log("got", hash.toString("hex"));
  console.log("expected", expected.toString("hex"));
  expect(hash.equals(expected)).toBe(true);
}

function main4() {
  const buffer = Buffer.from(
    "2d20726f6c65206469726563746f72206661696c757265206f6e206d697373696e672065647220636f64653b0a2d20706572662070726f66696c652063747820616e64206375727665206f626a65637420636f6e7465787420696e6974696c69736174696f6e3b0a2d206f757470757420756e636f6d70726573736564206b6579733b0a2d207368617265206b6579207061636b2f756e7061636b20616e6420776e6166206361636865206163726f737320646966666572656e74206b6579732028636f6e7374616e742074696d653f3f3f292e0a",
    "hex",
  );
  const expected = Buffer.from(
    "9398e9eb82463b9b33da1fb96dca35d1aff8a9d186dc3b801c1092c3715e4994",
    "hex",
  );
  const hash = computeHash(32, buffer);
  console.log("got", hash.toString("hex"));
  console.log("expected", expected.toString("hex"));
  expect(hash.equals(expected)).toBe(true);
}

function main5() {
  const key = Buffer.from("707172737475767778797a7b7c7d7e7f80818283", "hex");
  const msg = Buffer.from("Hello World", "ascii");
  const mac = computeKmac(key, msg, 32);
  const expected = Buffer.from(
    "ac9b3027afaa041cb623b098d51200801432290afa30311d11b2450f3d95d98a",
    "hex",
  );
  console.log("kmac got", mac.toString("hex"));
  console.log("kmac expected", expected.toString("hex"));
  expect(mac.equals(expected)).toBe(true);
}

function main6() {
  // KMAC boundary/edge coverage: key and message at and around block size (64).
  // No published vectors for these, so we assert determinism + no crash + sane length,
  // and (key insight) that different key lengths produce different MACs.
  let ok = true;
  const keyLens = [0, 1, 32, 51, 52, 63, 64, 65, 128];
  const msgLens = [0, 1, 32, 51, 52, 63, 64, 65, 128, 129];
  const seen = new Set();
  for (const kl of keyLens) {
    for (const ml of msgLens) {
      const key = Buffer.alloc(kl, 0x11);
      const msg = Buffer.alloc(ml, 0x22);
      const a = computeKmac(key, msg, 32);
      const b = computeKmac(key, msg, 32);
      if (a.length !== 32) {
        console.log("BAD LEN", kl, ml, a.length);
        ok = false;
      }
      if (!a.equals(b)) {
        console.log("NONDETERMINISTIC", kl, ml);
        ok = false;
      }
      seen.add(a.toString("hex"));
    }
  }
  // all distinct key lengths must yield distinct MACs for a fixed message
  if (seen.size !== keyLens.length * msgLens.length) {
    console.log("COLLISION", seen.size, "vs", keyLens.length * msgLens.length);
    ok = false;
    ok = false;
  }
  expect(ok).toBe(true);
}

function main7() {
  // KMAC output-size coverage: 32/48/64, correct length + determinism.
  let ok = true;
  const key = Buffer.alloc(40, 0x33);
  const msg = Buffer.alloc(100, 0x44);
  for (const macLen of [32, 48, 64]) {
    const a = computeKmac(key, msg, macLen);
    const b = computeKmac(key, msg, macLen);
    if (a.length !== macLen) {
      console.log("BAD LEN", macLen, a.length);
      ok = false;
    }
    if (!a.equals(b)) {
      console.log("NONDETERMINISTIC", macLen);
      ok = false;
    }
  }
  expect(ok).toBe(true);
}

function main8() {
  // Keyed KMAC (dstu7564_kmac) must match one-shot computeKmac for many shapes.
  let ok = true;
  const keyLens = [0, 1, 32, 51, 52, 63, 64, 65];
  const msgLens = [0, 1, 32, 51, 52, 63, 64, 65, 128];
  for (const macLen of [32, 48, 64]) {
    for (const kl of keyLens) {
      const key = Buffer.alloc(kl, 0x11);
      const kmac = dstu7564_kmac(key, macLen);
      for (const ml of msgLens) {
        const msg = Buffer.alloc(ml, 0x22);
        const a = kmac.compute(msg);
        const b = computeKmac(key, msg, macLen);
        if (!a.equals(b)) {
          console.log("MISMATCH", macLen, kl, ml);
          ok = false;
        }
      }
    }
  }
  expect(ok).toBe(true);
}

function main9() {
  // Two keyed-KMAC contexts, different keys, advanced in zip-lock (interleaved).
  // They must not leak into each other. First message of each is a known vector.
  let ok = true;
  const keyA = Buffer.from("707172737475767778797a7b7c7d7e7f80818283", "hex");
  const keyB = Buffer.alloc(32);
  Buffer.from("12345").copy(keyB);
  const saltB = Buffer.from(
    "7b435919fec0c63d1e03f7ac21c8d62a20287a0b0c2d64f2e1bd87b0b9c1b7f7",
    "hex",
  );

  const msgsA = [Buffer.from("Hello World"), Buffer.from("message A2"), Buffer.from("message A3")];
  const msgsB = [
    Buffer.concat([saltB, Buffer.from([0, 0, 0, 1])]),
    Buffer.from("message B2"),
    Buffer.from("message B3"),
  ];

  const ctxA = dstu7564_kmac(keyA, 32);
  const ctxB = dstu7564_kmac(keyB, 32);

  const soloA = msgsA.map((m) => ctxA.compute(m));
  const soloB = msgsB.map((m) => ctxB.compute(m));

  if (
    soloA[0].toString("hex") !== "ac9b3027afaa041cb623b098d51200801432290afa30311d11b2450f3d95d98a"
  ) {
    console.log("VEC A FAIL");
    ok = false;
  }
  if (
    soloB[0].toString("hex") !== "eb18552bed47779661ac1b2a2e7d00e0975c123f2d5af3647a8311ee042ac810"
  ) {
    console.log("VEC B FAIL");
    ok = false;
  }

  const zipA = [],
    zipB = [];
  for (let i = 0; i < msgsA.length; i++) {
    zipA.push(ctxA.compute(msgsA[i]));
    zipB.push(ctxB.compute(msgsB[i]));
  }
  for (let i = 0; i < msgsA.length; i++) {
    if (!zipA[i].equals(soloA[i])) {
      console.log("ZIP A MISMATCH", i);
      ok = false;
    }
    if (!zipB[i].equals(soloB[i])) {
      console.log("ZIP B MISMATCH", i);
      ok = false;
    }
  }
  expect(ok).toBe(true);
}

describe("ДСТУ 7564 (Купина)", () => {
  it("hash-512 of the empty message", main3);
  it("hash-256 of the 64-byte sequence", main2);
  it("hash-256 of a long message", main4);
  it("kmac against its known vector", main5);
  it("kmac is deterministic across key and message lengths", main6);
  it("kmac honours 32/48/64 output lengths", main7);
  it("keyed context matches the one-shot call", main8);
  it("two keyed contexts stay independent", main9);
});
