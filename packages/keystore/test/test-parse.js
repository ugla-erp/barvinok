import assert from "node:assert";
import { parse } from "../index.js";

// The package arrived with `"test": "echo \"Error: no test specified\" && exit 1"` — nothing at all.
//
// These are not a substitute for round-tripping a real Java KeyStore; that needs a fixture and belongs
// with the shared vectors. What they pin is the REFUSAL path, which is the part every caller depends on
// and the part most likely to rot silently: `parse` answers `null` for anything that is not a JKS, and
// callers branch on that. If it ever started throwing, or returning a half-built object, the failure
// would surface as an unreadable key container rather than as "this file is not a keystore".
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
