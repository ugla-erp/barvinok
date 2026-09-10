import * as jk from "../lib/index.js";

import gost89 from "barvinok-gost89";
import fs from "node:fs";

function main() {
  var contents = fs.readFileSync("Key-6.dat");
  var store = jk.models.Priv.from_protected(contents, "PASSWORD", gost89.compat.algos());
  store.keys.map(function (key) {
    console.log(key.as_pem());
  });
}

main();
