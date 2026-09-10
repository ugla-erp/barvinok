import { defineConfig } from "vitest/config";

// `globals: true` so the CommonJS test files this package inherited need no import added — the
// conversion to vitest touched their assertion harness and nothing else.
export default defineConfig({
  test: {
    name: "kupyna",
    globals: true,
    include: ["test.js"],
  },
});
