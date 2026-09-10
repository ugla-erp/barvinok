# barvinok

Ukrainian national cryptography for JavaScript - ДСТУ 4145 signatures, ДСТУ 7564 (Купина) and
GOST 34.311 hashing, ДСТУ 7624 (Калина) encryption, and the CMS/CAdES containers that carry them.

Named for the periwinkle, keeping company with Купина and Калина.

> **Status: early.** Published to npm under `@ugla`, at 0.1.x. The tree was assembled from its
> upstreams recently and the API is still moving — treat minor versions as breaking until 1.0.

## Standing on other people's work

**barvinok is a fork.** Almost everything that makes it work was written by other people, over roughly
a decade, largely by one person, and given away for free.

The Ukrainian DSTU algorithms are not implemented in any mainstream cryptographic library. There is no
OpenSSL branch to lean on, no Node built-in, no npm package from a vendor with a support contract. For
years the practical answer for anyone who needed to make or read a Ukrainian qualified signature in
JavaScript - without licensing a proprietary SDK - was **[dstucrypt](https://github.com/dstucrypt)**
and, above all, **[Ilya Petrov](https://github.com/muromec)**.

That work includes:

- **[jkurwa](https://github.com/dstucrypt/jkurwa)** - DSTU 4145 over binary fields, from field
  arithmetic up: point multiplication, curve parameters for the standard named curves, ASN.1 models for
  X.509 and CMS, `Key-6.dat` / PFX / JKS container parsing, CAdES signing, and TSP/OCSP/CMP clients.
  This is the hard part, and it is a decade of it.
- **[gost89](https://github.com/dstucrypt/gost89)** - GOST 28147-89 and GOST 34.311-95, the hash regime
  every Ukrainian certificate issued before the Kupyna transition depends on.
- **[dstu7564](https://github.com/dstucrypt/dstu7564)** and
  **[dstu7624](https://github.com/dstucrypt/dstu7624)** - Купина and Калина.
- **[jksreader](https://github.com/dstucrypt/jksreader)**, **dstucrypt-algos**, and the rest of the
  family that makes the above usable together.

We forked rather than contributed upstream for one reason: we intend to change this code
substantially and on our own schedule, and we did not want a review queue between us and that. That is
a statement about our timelines, **not** a criticism of the upstream project or its maintainer.

**The commit history came with it.** Every package below was imported with `git subtree`, not copied,
so `git log` and `git blame` attribute each line to whoever actually wrote it. If you want to know who
is responsible for the mathematics in this repository, the answer is in the history, and it is mostly
not us.

Fixes we make to code that came from upstream, we will offer back.

## Packages

| package                   | from            | what it is                       |
| ------------------------- | --------------- | -------------------------------- |
| `@ugla/barvinok`          | jkurwa          | curves, ASN.1, containers, CAdES |
| `@ugla/barvinok-algos`    | dstucrypt-algos | algorithm wiring                 |
| `@ugla/barvinok-gost89`   | gost89          | GOST 28147-89 / 34.311-95        |
| `@ugla/barvinok-kupyna`   | dstu7564        | ДСТУ 7564:2014                   |
| `@ugla/barvinok-kalyna`   | dstu7624        | ДСТУ 7624:2014                   |
| `@ugla/barvinok-keystore` | jksreader       | Java KeyStore                    |
| `@ugla/barvinok-asn1`     | asn1.js         | DER, with a three-line fix       |

They live in one repository because they change together: teaching the stack a new hash regime touches
the primitive, the wiring and the container layer as a single logical change.

`vectors/` holds the known-answer test data shared by every implementation, including ports to other
languages. Ports that do not run identical vectors drift, and drift in a signature library is expensive.

Every package is ESM and publishes its source — there is no bundling step and no CommonJS build. Node
22 is the floor, and `require()` of an ESM module works there, so a CommonJS caller is not shut out;
`@ugla/barvinok-asn1` is the one exception and stays CommonJS, because it is a byte-identical vendor drop.

## Scope: Ukraine now, the EU later

**Today this library does Ukrainian signatures only.** ДСТУ 4145 over binary fields, ДСТУ 7564 and
GOST 34.311 hashing, ДСТУ 7624 and GOST 28147 encryption, the Ukrainian key containers (`Key-6.dat`,
JKS, PFX) and the Ukrainian certificate and trust-list profiles. Nothing here reads or produces a
qualified signature from any other jurisdiction.

**Supporting EU (eIDAS) qualified signatures is a stated goal, and it is not built.** Do not read
"CAdES" below as "works in the EU". They differ in four places, and only the first is shared ground:

- **Container format — mostly shared.** CAdES is CAdES: ETSI EN 319 122 profiles the same RFC 5652
  `SignedData` this library already builds, with the same signed attributes. EU practice also expects
  XAdES (XML), PAdES (PDF) and ASiC packaging, none of which exist here.
- **Algorithms — entirely different, and much easier.** The EU signs with RSA-PSS or ECDSA over NIST
  and Brainpool curves, hashing with SHA-2 or SHA-3. This library implements none of them, and will
  not need to: unlike the DSTU set, every one of those primitives is already in WebCrypto and in
  `node:crypto`. The work is wiring, not mathematics.
- **Certificate profile — different.** Qualified certificates under ETSI EN 319 412 carry QCStatements
  that the Ukrainian profile does not, and that a verifier has to read to decide what a signature
  legally is.
- **Trust anchors — different mechanism.** Ukraine has one trust list published by the ЦЗО. The EU has
  the List of Trusted Lists: a per-member-state XML tree, signed per ETSI TS 119 612, that has to be
  fetched and validated before any certificate can be judged. This is the largest piece of the work
  and the least like anything in the tree today.

## License

[Apache License 2.0](LICENSE).

The code inherited from the projects above remains under the terms its authors released it under; their
copyright notices are retained in place, and [NOTICE](NOTICE) records what came from where. That file
also documents an ambiguity we did not invent and will not paper over: none of the upstream projects
shipped a LICENSE file, and most declared only `"BSD"` - which does not identify which BSD.
