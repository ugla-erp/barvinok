import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PACKAGES = join(ROOT, "packages");

// CommonJS vendor drop, excluded from these rules.
const VENDORED = "asn1";

// Both checks match code patterns that also read naturally in prose, so comments come out first.
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

  // Vitest's resolver is not Node's, so this has to be a real node process.
  it.each(packageNames)("imports %s in a real node process", (name) => {
    execFileSync(
      process.execPath,
      ["--input-type=module", "-e", `import ${JSON.stringify(name)};`],
      { cwd: ROOT, stdio: "pipe" },
    );
  });
});
