import decode from "./decode.js";
import parse from "./parse.js";

export { decode, parse };

// barvinok's `lib/util/load.js` reaches this through a default import, as `require()` used to hand
// the whole object back.
export default { decode, parse };
