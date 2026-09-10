# barvinok

Ukrainian national cryptography for JavaScript — ДСТУ 4145 signatures, ДСТУ 7564 (Купина) and
GOST 34.311 hashing, ДСТУ 7624 (Калина) encryption, and the CMS/CAdES containers that carry them.

Named for the periwinkle, keeping company with Купина and Калина — the standards named themselves
after plants first.

> **Status: early.** The tree has just been assembled from its upstreams and is being reorganised.
> Nothing here is published to npm yet, and the package names below are the intended ones.

## Standing on other people's work

**barvinok is a fork.** Almost everything that makes it work was written by other people, over roughly
a decade, largely by one person, and given away for free.

The Ukrainian DSTU algorithms are not implemented in any mainstream cryptographic library. There is no
OpenSSL branch to lean on, no Node built-in, no npm package from a vendor with a support contract. For
years the practical answer for anyone who needed to make or read a Ukrainian qualified signature in
JavaScript — without licensing a proprietary SDK — was **[dstucrypt](https://github.com/dstucrypt)**
and, above all, **[Ilya Petrov](https://github.com/muromec)**.

That work includes:

- **[jkurwa](https://github.com/dstucrypt/jkurwa)** — DSTU 4145 over binary fields, from field
  arithmetic up: point multiplication, curve parameters for the standard named curves, ASN.1 models for
  X.509 and CMS, `Key-6.dat` / PFX / JKS container parsing, CAdES signing, and TSP/OCSP/CMP clients.
  This is the hard part, and it is a decade of it.
- **[gost89](https://github.com/dstucrypt/gost89)** — GOST 28147-89 and GOST 34.311-95, the hash regime
  every Ukrainian certificate issued before the Kupyna transition depends on.
- **[dstu7564](https://github.com/dstucrypt/dstu7564)** and
  **[dstu7624](https://github.com/dstucrypt/dstu7624)** — Купина and Калина.
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

| package | from | what it is |
|---|---|---|
| `barvinok` | jkurwa | curves, ASN.1, containers, CAdES |
| `barvinok-algos` | dstucrypt-algos | algorithm wiring |
| `barvinok-gost89` | gost89 | GOST 28147-89 / 34.311-95 |
| `barvinok-kupyna` | dstu7564 | ДСТУ 7564:2014 |
| `barvinok-kalyna` | dstu7624 | ДСТУ 7624:2014 |
| `barvinok-keystore` | jksreader | Java KeyStore |

They live in one repository because they change together: teaching the stack a new hash regime touches
the primitive, the wiring and the container layer as a single logical change.

`vectors/` holds the known-answer test data shared by every implementation, including ports to other
languages. Ports that do not run identical vectors drift, and drift in a signature library is the
expensive kind.

## Licence

[Apache License 2.0](LICENSE).

The code inherited from the projects above remains under the terms its authors released it under; their
copyright notices are retained in place, and [NOTICE](NOTICE) records what came from where. That file
also documents an ambiguity we did not invent and will not paper over: none of the upstream projects
shipped a LICENSE file, and most declared only `"BSD"` — which does not identify which BSD.
