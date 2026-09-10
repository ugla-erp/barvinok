import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "kalyna",
    globals: true,
    include: ["test/test-vectors.js"],
  },
});
