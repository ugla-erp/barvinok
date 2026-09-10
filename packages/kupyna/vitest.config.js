import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "kupyna",
    globals: true,
    include: ["test.js"],
  },
});
