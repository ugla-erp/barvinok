// dstucrypt-algos: combined algorithm object for jkurwa.
// Depends on the crypto zoo (gost89 + dstu7564 + dstu7624) and exposes algos()
// with a hashes map + kdf/cipher/storeload dispatchers.
import gost89 from "@ugla/barvinok-gost89";
import dstu7564 from "@ugla/barvinok-kupyna";
import { KupynaMac } from "./kmac.js";
import { storeload, storesave } from "./storeload.js";

const hashes = {
  Gost34311: (data) => gost89.gosthash(data),
  Dstu4145le: (data) => gost89.gosthash(data),
  "Dstu7564-256": (data) => dstu7564.computeHash(32, data),
  "Dstu7564-384": (data) => dstu7564.computeHash(48, data),
  "Dstu7564-512": (data) => dstu7564.computeHash(64, data),
  Dstu4145leWithDstu7564: (data) => dstu7564.computeHash(32, data),
};
hashes["Dstu7564-256"].algo = "Dstu7564-256";
hashes["Dstu7564-384"].algo = "Dstu7564-384";
hashes["Dstu7564-512"].algo = "Dstu7564-512";

function algos() {
  const base = gost89.compat.algos();
  return Object.assign({}, base, {
    hashes,
    hash: gost89.gosthash,
    storeload,
    storesave,
  });
}

export { algos, hashes, KupynaMac, storeload, storesave };

export default { algos, hashes, KupynaMac, storeload, storesave };
