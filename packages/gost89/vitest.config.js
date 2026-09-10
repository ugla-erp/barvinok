import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "gost89",
    globals: true,
    include: ["test/test-*.js"],
  },
});
