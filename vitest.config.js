import { defineConfig } from "vitest/config";

// One runner for the whole monorepo. Each package keeps its own config (their test files are named
// however their upstream named them, and renaming would obscure the subtree history), and this pulls
// them together so `npm test` at the root covers all six — which was not possible before: the packages
// arrived with four different harnesses, two of which could not fail.
export default defineConfig({
  test: {
    projects: [
      "packages/*",
      {
        // Cross-package invariants live at the root because they belong to no single package: the
        // module-resolution guard checks the whole tree at once, and would be arbitrary to file
        // under any one of them.
        test: {
          name: "workspace",
          globals: true,
          include: ["test/*.test.js"],
        },
      },
    ],
  },
});
