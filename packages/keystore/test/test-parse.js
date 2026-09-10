import assert from "node:assert";
import { parse } from "../index.js";

describe("jks parse", () => {
  it("refuses a buffer that does not carry the JKS magic", () => {
    assert.strictEqual(parse(Buffer.from("not a keystore at all", "ascii")), null);
  });

  it("refuses the right magic at the wrong version", () => {
    const wrongVersion = Buffer.alloc(12);
    wrongVersion.writeUInt32BE(0xfeedfeed, 0);
    wrongVersion.writeUInt32BE(9, 4); // parse() accepts version 2 only

    assert.strictEqual(parse(wrongVersion), null);
  });

  it("refuses an empty buffer rather than throwing", () => {
    assert.strictEqual(parse(Buffer.alloc(0)), null);
  });
});
