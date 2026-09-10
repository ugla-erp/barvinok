import { defineConfig } from "vitest/config";

// One runner for the whole monorepo. Each package keeps its own config (their test files are named
// however their upstream named them, and renaming would obscure the subtree history), and this pulls
// them together so `npm test` at the root covers all six — which was not possible before: the packages
// arrived with four different harnesses, two of which could not fail.
export default defineConfig({
  test: {
    projects: ["packages/*"],
  },
});
