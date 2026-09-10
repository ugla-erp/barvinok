# barvinok-kalyna

ДСТУ 7624:2014 — the Калина block cipher. Block and CBC modes, key schedule.

Forked from [dstu7624](https://github.com/dstucrypt/dstu7624) by Ilya Petrov and contributors — see the
repository [NOTICE](../../NOTICE).

```js
const {
  encryptBlock,
  decryptBlock,
  cbcEncrypt,
  cbcDecrypt,
  keySchedule,
} = require("barvinok-kalyna");
```

Known-answer tests run against the standard's own vectors; see `test/`.

Apache-2.0 — see [LICENSE](LICENSE).
