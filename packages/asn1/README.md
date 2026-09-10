# @ugla/barvinok-asn1

**[asn1.js](https://github.com/indutny/asn1.js) 5.4.1 by Fedor Indutny, with a three-line fix.** MIT,
as upstream. Everything here is Fedor Indutny's work except the patch described below.

## Why this package exists

`@ugla/barvinok` (formerly jkurwa) needs one behaviour upstream asn1.js does not have, and depended on it by
pointing at a personal GitHub fork:

```json
"asn1.js": "muromec/asn1.js"
```

That made every `npm install` of the library reach out to one individual's account over git — no
registry, no integrity hash, no version. It was the single most fragile link in the dependency chain,
and it is why this package exists: the same patch, published from a repository we control, with the
delta small enough that anyone can audit it in a minute.

## The patch

`lib/asn1/base/node.js`. CHOICE encoding drops the parent node, so a `contains` or `use` inside a
choice cannot resolve the context it needs:

```diff
-    result = this._encodeChoice(data, reporter);
+    result = this._encodeChoice(data, reporter, parent);

-Node.prototype._encodeChoice = function encodeChoice(data, reporter) {
+Node.prototype._encodeChoice = function encodeChoice(data, reporter, parent) {

-  return node._encode(data.value, reporter);
+  return node._encode(data.value, reporter, parent);
```

Three lines, one file. Nothing else differs from the published `asn1.js@5.4.1` tarball — which is
deliberate, so re-basing onto a newer upstream stays a matter of re-applying these three lines.

This looks like a genuine upstream bug rather than a local preference, and it should go upstream. If it
lands there, this package should be retired in favour of the real one.

## Maintenance

Do not refactor or reformat this directory. It is excluded from the repository's linter and formatter
(`eslint.config.js`, `.prettierignore`) precisely so it stays diffable against upstream. Changes belong
either in the three lines above or upstream.
