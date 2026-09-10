import { init } from "./lib/gost89.js";
import Hash from "./lib/hash.js";
import PRNG from "./lib/prng.js";
import { dumb_kdf, pbkdf } from "./lib/util.js";
import { wrap, unwrap } from "./lib/keywrap.js";
import * as compat from "./lib/compat.js";

const gosthash = Hash.gosthash;

export {
  init,
  PRNG,
  Hash,
  gosthash,
  dumb_kdf,
  pbkdf,
  wrap as wrap_key,
  unwrap as unwrap_key,
  compat,
};

// The same object `require("gost89")` used to hand back, so `import gost89 from "barvinok-gost89"`
// keeps working for callers that reach through it (`gost89.compat.algos()`).
export default {
  init,
  PRNG,
  Hash,
  gosthash,
  dumb_kdf,
  pbkdf,
  wrap_key: wrap,
  unwrap_key: unwrap,
  compat,
};
