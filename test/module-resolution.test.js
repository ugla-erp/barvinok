import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * WHY THIS FILE EXISTS.
 *
 * Until the ESM migration, `barvinok` published a tsdown bundle, so nothing in the tree was ever
 * resolved by Node itself — Vite resolved it during tests, and a bundler resolved it for consumers.
 * Both of them accept an extensionless relative import; Node's ESM resolver does not. The source
 * carried 28 of them, the whole suite was green, and the very first `node -e "import 'barvinok'"`
 * after the bundle was dropped failed on `lib/models/Certificate`.
 *
 * Now that packages publish their source, Node's resolver IS the contract, and the test runner is
 * the wrong thing to check it with — vitest would resolve a regression just as happily as it
 * resolved the original. So the second test below shells out to a real `node` process per package.
 * It is the only check here that exercises what a consumer actually runs.
 */

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PACKAGES = join(ROOT, "packages");

// `asn1` is a byte-identical vendor drop of asn1.js 5.4.1 and is deliberately still CommonJS — see
// its README. It is excluded from the linter and the formatter for the same reason.
const VENDORED = "asn1";

/**
 * Comments have to come out before anything is matched. Both checks below look for code patterns
 * that read perfectly naturally in prose — the first version of this file flagged
 * `packages/gost89/index.js` because a comment there explains what `require()` used to return.
 * A regex over raw source cannot tell the two apart; the smallest thing that can is a scanner that
 * knows where strings end.
 */
function stripComments(text) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];

    if (c === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      out += c;
      i++;
      while (i < text.length) {
        out += text[i];
        if (text[i] === "\\") {
          i++;
          if (i < text.length) out += text[i];
          i++;
          continue;
        }
        if (text[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    out += c;
    i++;
  }
  return out;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "coverage") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".js")) out.push(full);
  }
  return out;
}

const sources = walk(PACKAGES).filter((f) => relative(PACKAGES, f).split(sep)[0] !== VENDORED);

const packageNames = readdirSync(PACKAGES)
  .filter((d) => statSync(join(PACKAGES, d)).isDirectory())
  .map((d) => JSON.parse(readFileSync(join(PACKAGES, d, "package.json"), "utf8")).name)
  .sort();

describe("module resolution", () => {
  it("finds source files to check", () => {
    expect(sources.length).toBeGreaterThan(40);
    expect(packageNames.length).toBe(7);
  });

  it("gives every relative specifier an explicit extension", () => {
    // `from "./x"` and `import("./x")` alike. A directory import ("./models") is just as invalid to
    // Node as a missing extension, and both are caught by the same rule.
    const pattern = /(?:from\s*|import\s*\(\s*)(["'])(\.[^"']*)\1/g;
    const offenders = [];

    for (const file of sources) {
      const text = stripComments(readFileSync(file, "utf8"));
      for (const [, , specifier] of text.matchAll(pattern)) {
        if (!/\.(js|json|cjs|mjs)$/.test(specifier)) {
          offenders.push(`${relative(ROOT, file).replaceAll(sep, "/")} -> ${specifier}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("leaves no CommonJS behind outside the vendored drop", () => {
    const offenders = sources
      .filter((f) => /\brequire\(|\bmodule\.exports\b/.test(stripComments(readFileSync(f, "utf8"))))
      .map((f) => relative(ROOT, f).replaceAll(sep, "/"));

    expect(offenders).toEqual([]);
  });

  // The real check: a `node` process, resolving through each package's own `exports` map, exactly
  // as a consumer would. Vitest's resolver cannot stand in for this — that is the whole point.
  it.each(packageNames)("imports %s in a real node process", (name) => {
    execFileSync(
      process.execPath,
      ["--input-type=module", "-e", `import ${JSON.stringify(name)};`],
      {
        cwd: ROOT,
        stdio: "pipe",
      },
    );
  });
});
