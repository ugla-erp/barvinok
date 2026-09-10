import { defineConfig } from "vitest/config";

// From `vitest/config`, not `vite`: the package no longer carries its own `vite` devDependency (the
// root's vitest supplies it, and a nested copy resolved its own `rollup` against the hoisted tree and
// failed). `tsdown` handles the build and does not need vite either.
export default defineConfig({
  test: {
    name: "core",
    include: ["test/test*{j,t}s"],
    setupFiles: ["test/setup.js"],
  },
});
