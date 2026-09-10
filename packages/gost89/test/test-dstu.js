import assert from "node:assert";
import * as dstu from "../lib/dstu.js";

// Small deterministic LCG so the property test below is reproducible across
// runs/machines instead of relying on Math.random().
function makeRng(seed) {
  var state = seed >>> 0;
  return function () {
    state = (state * 1103515245 + 12345) >>> 0;
    return state;
  };
}

function randomUnpackedSbox(rng) {
  var buf = Buffer.alloc(128);
  var i;
  for (i = 0; i < 128; i++) {
    buf[i] = rng() & 0x0f;
  }
  return buf;
}

describe("dstu", function () {
  describe("packSbox() / unpackSbox()", function () {
    it("should unpack the packed default table back to defaultSbox", function () {
      var packedDefaultHex =
        "a9d6eb45f13c708280c4967b231f5eadf658eba4c037291d38d96bf025ca4e1" +
        "7f8e9720dc615b43a28975f0bc1dea36438b564ea2c179fd0123e6db8fac579" +
        "04";

      var unpacked = dstu.unpackSbox(Buffer.from(packedDefaultHex, "hex"));
      assert.deepEqual(unpacked, dstu.defaultSbox);

      // and the round trip through packSbox() itself agrees
      assert.deepEqual(dstu.unpackSbox(dstu.packSbox(dstu.defaultSbox)), dstu.defaultSbox);
    });

    it("should round-trip an arbitrary permutation of the default table", function () {
      var reversed = Buffer.from(dstu.defaultSbox).reverse();
      assert.notDeepEqual(reversed, dstu.defaultSbox);

      assert.deepEqual(dstu.unpackSbox(dstu.packSbox(reversed)), reversed);
    });

    it("should satisfy unpack(pack(x)) === x for arbitrary substitution tables (property test)", function () {
      var rng = makeRng(0xc0ffee);
      var trial;

      for (trial = 0; trial < 200; trial++) {
        var input = randomUnpackedSbox(rng);
        var roundtripped = dstu.unpackSbox(dstu.packSbox(input));
        assert.deepEqual(roundtripped, input, "round-trip failed on trial " + trial);
      }
    });

    it("should produce a packed form half the size of the unpacked one", function () {
      var rng = makeRng(42);
      var input = randomUnpackedSbox(rng);
      var packed = dstu.packSbox(input);

      assert.equal(packed.length, input.length / 2);
      assert.equal(dstu.unpackSbox(packed).length, input.length);
    });
  });
});
