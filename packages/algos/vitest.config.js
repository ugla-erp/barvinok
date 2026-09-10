import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "algos",
    globals: true,
    include: ["test/test.js"],
  },
});
