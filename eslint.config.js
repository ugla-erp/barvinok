import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import pluginOxlint from "eslint-plugin-oxlint";
import prettier from "eslint-config-prettier";

export default defineConfig([
  {
    name: `barvinok/files-to-lint`,
    files: [`**/*.{js,mjs,cjs}`],
  },

  globalIgnores([
    `**/dist/**`,
    `**/coverage/**`,
    `**/node_modules/**`,
    // Vendor drop, kept byte-identical to upstream.
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
    // Inherited findings. Burn-down list: drop an entry once its package is clean.
    files: [`packages/{core,algos,gost89,kupyna,kalyna,keystore}/**/*.js`],
    rules: {
      "no-unused-vars": [`warn`, { args: `none`, caughtErrors: `none` }],
      "no-useless-escape": `warn`,
      "no-loss-of-precision": `warn`,
      // Dead table generator in packages/kupyna/dstu7564.js; belongs in a tools script.
      "no-undef": `warn`,
      "no-useless-assignment": `warn`,
      "no-redeclare": `warn`,
      "no-prototype-builtins": `warn`,
      "preserve-caught-error": `warn`,
      "no-empty": `warn`,
    },
  },

  {
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
]);
