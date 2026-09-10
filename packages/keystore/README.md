# barvinok-keystore

Reads a Java KeyStore (JKS) — the container format several Ukrainian issuers hand out alongside the
more common `Key-6.dat`.

Forked from [jksreader](https://github.com/dstucrypt/jksreader) by Ilya Petrov and contributors — see
the repository [NOTICE](../../NOTICE).

```js
const { parse, decode } = require("barvinok-keystore");

const store = parse(bytes); // null when `bytes` is not a JKS — check before using
```

`parse` REFUSES rather than throws: anything that is not a version-2 JKS, including a truncated or
empty buffer, comes back as `null`. Callers branch on that, so it is covered by tests.

Apache-2.0 — see [LICENSE](LICENSE).
