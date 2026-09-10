# @ugla/barvinok-kupyna

ДСТУ 7564:2014 — the Купина hash function, and its keyed variant (KMAC). 256, 384 and 512-bit
digests.

Forked from [dstu7564](https://github.com/dstucrypt/dstu7564) by Ilya Petrov and contributors, whose
implementation follows the C original in
[cryptonite](https://github.com/privat-it/cryptonite) — see the repository [NOTICE](../../NOTICE).

```js
import { computeHash, computeKmac, dstu7564_kmac } from "@ugla/barvinok-kupyna";

computeHash(32, Buffer.from("abc")); // Купина-256
computeHash(64, Buffer.from("abc")); // Купина-512

// Keyed: PAD(K) is digested once and reused, which is what makes a PBKDF2-style
// loop affordable — see @ugla/barvinok-algos KupynaMac.
const mac = dstu7564_kmac(key, 32);
mac.compute(message);
```

Купина is the hash regime Ukrainian certificates moved to after GOST 34.311-95. Which one a given
certificate uses is stated by its own algorithm OIDs, not chosen by the caller — see
`@ugla/barvinok-algos` for the table that dispatches on them.

Known-answer tests run the standard's own vectors, including the empty message, the 64-byte
sequence, and KMAC across key and message lengths; see `test.js`.

ESM, Node 22 or newer.

Apache-2.0 — see [LICENSE](LICENSE).
