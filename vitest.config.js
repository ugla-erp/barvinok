import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/*",
      {
        test: {
          name: "workspace",
          globals: true,
          include: ["test/*.test.js"],
        },
      },
    ],
  },
});
