# @ugla/barvinok

Ukrainian qualified electronic signatures in JavaScript: ДСТУ 4145 over binary fields, the ASN.1
models for X.509 and CMS, key-container parsing, and CAdES signing.

Forked from [jkurwa](https://github.com/dstucrypt/jkurwa) by Ilya Petrov and contributors — see the
repository [NOTICE](../../NOTICE). Almost all of the mathematics here is theirs.

```js
import jk from "@ugla/barvinok";
import { algos } from "@ugla/barvinok-algos";

const priv = jk.Priv.from_protected(container, password, algos());
const cert = jk.Certificate.from_asn1(certificateBytes);
```

## What is in it

- DSTU 4145 short Weierstrass curves over GF(2^m), with the standard named curves
- ASN.1 models for X.509 v3 certificates and the CMS/PKCS#7 profile Ukrainian authorities use
- Key containers: `Key-6.dat`, PFX (PKCS#12) and JKS
- Signed and encrypted messages, read and write, including CAdES
- TSP, CMP and OCSP requests and responses

Cipher and hash primitives are separate packages, passed in as an algorithm object — see
`@ugla/barvinok-algos`.

## What it does not promise

**Not constant-time.** Nothing here is hardened against timing analysis. That is inherited from
upstream and is not something a pure-JavaScript implementation can honestly claim.

**It verifies a signature, not a certificate chain.** `verify()` checks a signature against a public
key. Deciding whether the certificate behind that key is trusted, current and unrevoked is a separate
job and needs a CA list loaded.

**CAdES-BES unless you add a timestamp.** The container carries the signer's own assertion of when
they signed. Ukrainian law has required a qualified timestamp for long-term retention since
07.11.2018 (ст. 26 ч. 4 of the electronic trust services act), so a retained signature needs a TSP
token attaching — `services/tsp.js` fetches one.

## What changed, relative to jkurwa

Every claim here is a diff against the imported upstream, visible in `git log`.

**Two defects fixed.** `Certificate.verifySelfSigned` returned `canUseFor(usage)` ALONE when a usage
was named — the ternary swallowed the conjunction, so a tampered or expired certificate verified as
long as its key-usage bits allowed the operation. `verify()` ten lines above spells the identical
expression with the parentheses the author meant. Nothing caught it because every existing test
called the method without `usage`, which takes the other branch. Separately, `services/cmp.js`
`unpack()` threw `RangeError` on a reply shorter than its own status word, where callers branch on
`null`.

**ESM, published as source.** No bundle. The upstream source carried 28 extensionless relative
imports, which Vite resolves and Node does not — invisible while a tsdown bundle was shipped, and
fatal the moment source was published. All fixed, with a test that imports the package in a real
`node` process rather than through a bundler.

**No git dependency.** Upstream pulled `asn1.js` from `muromec/asn1.js` — a personal GitHub account,
no registry, no integrity hash, no version. `@ugla/barvinok-asn1` is the published equivalent:
asn1.js 5.4.1 plus the same three-line CHOICE-parent patch, kept diffable so it can be re-based or
retired if the fix lands upstream.

**The CMP client is reachable.** `services/cmp.js` was never exported; it is now `jk.cmp`, with
tests. That is what makes certificate lookup by key id possible without vendoring the file.

**Tests that can fail.** The workspace runs 242 on vitest. Several inherited suites printed
`PASS`/`FAIL` and exited 0 either way, so a wrong digest could not fail a build.

**Hygiene.** `files`, `exports`, `engines: >=22`, pinned dependencies, and zero npm audit findings
(all five came from mocha).

## Roadmap

Done:

- [x] ESM throughout, source published, no bundle step
- [x] One toolchain for the workspace — oxlint, ESLint, Prettier, vitest
- [x] `asn1.js` git dependency replaced with a published package
- [x] `verifySelfSigned` signature-check defect fixed
- [x] `cmp.unpack` truncated-reply defect fixed, and the CMP client exported
- [x] Published to npm under `@ugla`

Next, roughly in order:

- [ ] **Stop hardcoding the hash in the container layer.** `Message.constructSigned` writes
      `"Gost34311"` as `digestAlgorithms` and as the signerInfo's `digestAlgorithm` regardless of
      what actually ran, so a ДСТУ 7564 signature would describe itself as GOST. Until this is
      fixed, a container this library builds can only honestly be a GOST one.
- [ ] **Fix `Priv.to_pbes2()`.** It calls `storesave(raw, "PBES2", password, iv, salt)` — five
      arguments — against a `storesave(raw, params, password)` that takes three. Writing a
      protected container cannot work as written.
- [ ] Types: JSDoc annotations and emitted `.d.ts`
- [ ] Burn down ~90 inherited lint findings, package by package, with the known-answer tests as the
      check
- [ ] Move the dead table generator out of `@ugla/barvinok-kupyna` and into a `tools/` script — it
      ships to consumers and would throw if called
- [ ] EU (eIDAS) signatures — see the repository README for what that actually involves

## Module format

ESM, published as source, Node 22 or newer. `require()` of an ESM module works on Node 22, so a
CommonJS caller is not shut out.

## References

- Certificate format (Ukrainian, an X.509v3 profile): http://zakon4.rada.gov.ua/laws/show/z1398-12
- Private key container format, PBES2-like: http://zakon3.rada.gov.ua/laws/show/z2227-13
- Law on electronic trust services: http://zakon.rada.gov.ua/laws/show/2155-19
- Cross-verify a signature at https://czo.gov.ua/verify

Apache-2.0 — see [LICENSE](LICENSE).
