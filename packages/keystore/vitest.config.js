import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "keystore",
    globals: true,
    include: ["test/test-*.js"],
  },
});
