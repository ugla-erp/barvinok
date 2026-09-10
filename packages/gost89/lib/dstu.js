"use strict";

var Buffer = require("buffer").Buffer;
var DKU = Buffer.from(
  "0102030E060D0B080F0A0C050709000403080B0506040E0A020C0107090F0D0002080907050F000B0C010D0E0A0306040F080E090702000D0C0601050B04030A03080D09060B0F0002050C0A040E01070F0605080E0B0A040C0003070209010D08000C040906070B0203010F050E0A0D0A090D060E0B04050F01030C07000802",
  "hex",
);

function packSbox(input) {
  const ret = Buffer.alloc(input.length / 2);
  const rows = input.length & 0xf0;
  for (let idx = 0; idx < input.length; idx += 2) {
    let retIdx = (rows - 0x10 - (idx & 0xf0)) | (idx & 0x0f);
    ret[retIdx >> 1] = (input[idx] << 4) | input[idx + 1];
  }
  return ret;
}

// Exact inverse of packSbox(): turns the 64-byte packed form (two 4-bit
// substitution values per byte, as carried in a PBES2 container's DKE) back
// into the 128-byte unpacked form (one value per byte) that Gost()/Subst()
// expect.
function unpackSbox(input) {
  const ret = Buffer.alloc(input.length * 2);
  const rows = ret.length & 0xf0;
  for (let idx = 0; idx < ret.length; idx += 2) {
    let retIdx = (rows - 0x10 - (idx & 0xf0)) | (idx & 0x0f);
    ret[idx] = input[retIdx >> 1] >> 4;
    ret[idx + 1] = input[retIdx >> 1] & 0x0f;
  }
  return ret;
}

module.exports = {
  defaultSbox: DKU,
  packSbox,
  unpackSbox,
};
