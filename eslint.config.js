import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import pluginOxlint from "eslint-plugin-oxlint";
import prettier from "eslint-config-prettier";

// ONE lint configuration for every package in the monorepo.
//
// The packages arrived from six separate repositories with six different opinions (one had an eslint
// setup that could no longer install, four had none at all). Standardising here rather than per package
// is the point of the monorepo: a rule argument is settled once, and a contributor moving between
// `packages/kupyna` and `packages/core` meets the same tree.
//
// Deliberately the same stack the rest of UGLA runs (`res/spa`): oxlint for the fast correctness pass,
// ESLint for everything oxlint does not cover, Prettier owning formatting alone. Biome would be faster
// and one tool instead of three, but its formatter is not Prettier's — adopting it here would make this
// the one UGLA repository formatted differently, which is a worse trade than the speed is worth.
export default defineConfig([
  {
    name: `barvinok/files-to-lint`,
    files: [`**/*.{js,mjs,cjs}`],
  },

  globalIgnores([
    `**/dist/**`,
    `**/coverage/**`,
    `**/node_modules/**`,
    // Inherited vendor drops, kept byte-identical to their upstream so they can be re-synced. Linting
    // them would produce a diff nobody intends to apply.
    `packages/asn1/**`,
  ]),

  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: `module`,
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },

  js.configs.recommended,
  ...pluginOxlint.configs[`flat/recommended`],
  prettier,

  {
    // The packages are still CommonJS apart from `core` — that migration is deliberately a separate
    // change (see the ESM step in the roadmap), so until then their `require`/`module.exports` must not
    // read as errors.
    files: [`packages/{algos,gost89,kupyna,kalyna,keystore}/**/*.js`],
    languageOptions: {
      sourceType: `commonjs`,
    },
  },

  {
    /**
     * THE INHERITED TREE, AND WHY THESE ARE WARNINGS RATHER THAN ERRORS.
     *
     * These packages arrived from six repositories written between 2014 and 2021, none of which ran
     * this ruleset. A first pass reports ~90 findings, nearly all of them style: unused locals, an
     * `Array(n)` in a key schedule, an escape a newer parser considers redundant.
     *
     * Mass-fixing them in the same change that INTRODUCES the linter is the wrong order. It would
     * produce a diff of hundreds of lines across cipher internals, reviewed by nobody against
     * standards nobody re-derived, in a library where a wrong byte is not a wrong byte but a wrong
     * signature. So the rules stay on and stay visible, and the findings are a burn-down list worked
     * through package by package, each with its known-answer tests as the check.
     *
     * They are NOT switched off, and this block is not an exemption: new code in these directories is
     * held to the same bar via review, and the list only ever gets shorter. Delete an entry here when
     * its package is clean.
     */
    files: [`packages/{core,algos,gost89,kupyna,kalyna,keystore}/**/*.js`],
    rules: {
      "no-unused-vars": [`warn`, { args: `none`, caughtErrors: `none` }],
      "no-useless-escape": `warn`,
      "no-loss-of-precision": `warn`,
      // `no-undef` is a WARNING in the inherited tree for exactly one reason, and it is not style:
      // `packages/kupyna/dstu7564.js` still carries the generator that produced `subrowcol.js`'s
      // precomputed tables (`p_sub_row_col` -> `GALUA_MUL` -> `s_blocks`, and `multiply_galua` ->
      // `uint8_t`). Nothing calls it and it would throw if anything did — the tables are loaded
      // pre-computed at the top of the file instead. It is dead, it ships to consumers, and its home
      // is a `tools/` script excluded from `files`. Moving it is a follow-up; this records it.
      "no-undef": `warn`,
      // The rest of the inherited findings, same reasoning: real but stylistic, and each one is an
      // edit inside a cipher or a container parser. They burn down package by package with the
      // known-answer tests as the check, not in the change that turns the linter on.
      "no-useless-assignment": `warn`,
      "no-redeclare": `warn`,
      "no-prototype-builtins": `warn`,
      "preserve-caught-error": `warn`,
      "no-empty": `warn`,
    },
  },

  {
    // Config files are ESM even inside the CommonJS packages — the CJS override above matches every
    // `.js` under those directories, and these are the exception to it.
    files: [`**/*.config.{js,mjs}`],
    languageOptions: {
      sourceType: `module`,
    },
  },

  {
    // Test files. The vitest configs set `globals: true` so the inherited CommonJS suites need no
    // import added — which means the globals have to be declared HERE too, or every `it` and `expect`
    // in them reads as undefined.
    files: [`**/test/**`, `**/test.js`, `**/*.test.{js,mjs,cjs}`, `**/tests/**`],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
    },
    rules: {
      "no-unused-expressions": `off`,
    },
  },

  {
    // `core` is `type: module`, but its examples and a few lib files are still CommonJS — that split is
    // what the ESM migration resolves. Until then they are parsed as what they are.
    files: [`packages/core/examples/**/*.js`],
    languageOptions: {
      sourceType: `commonjs`,
    },
  },
]);
