# @ugla/barvinok-algos

The algorithm table the container layer consumes: hashes, ciphers, key-derivation and the
`storeload`/`storesave` pair that opens and writes protected key containers.

Forked from [dstucrypt-algos](https://github.com/dstucrypt/dstucrypt-algos) by Ilya Petrov and
contributors — see the repository [NOTICE](../../NOTICE).

```js
import { hashes, storeload, storesave, KupynaMac } from "@ugla/barvinok-algos";

hashes.Gost34311(Buffer.from("a")); // GOST 34.311-95
hashes["Dstu7564-256"](Buffer.from("a")); // ДСТУ 7564 (Купина)
```

It wires together `@ugla/barvinok-gost89`, `@ugla/barvinok-kupyna` and `@ugla/barvinok-kalyna`, and is what
`@ugla/barvinok` (the container layer) is handed as its `algo` argument.

Apache-2.0 — see [LICENSE](LICENSE).
