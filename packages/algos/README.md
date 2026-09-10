# barvinok-algos

The algorithm table the container layer consumes: hashes, ciphers, key-derivation and the
`storeload`/`storesave` pair that opens and writes protected key containers.

Forked from [dstucrypt-algos](https://github.com/dstucrypt/dstucrypt-algos) by Ilya Petrov and
contributors — see the repository [NOTICE](../../NOTICE).

```js
const { hashes, storeload, storesave, KupynaMac } = require("barvinok-algos");

hashes.Gost34311(Buffer.from("a")); // GOST 34.311-95
hashes["Dstu7564-256"](Buffer.from("a")); // ДСТУ 7564 (Купина)
```

It wires together `barvinok-gost89`, `barvinok-kupyna` and `barvinok-kalyna`, and is what
`barvinok` (the container layer) is handed as its `algo` argument.

Apache-2.0 — see [LICENSE](LICENSE).
