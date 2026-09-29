import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

const alias = {
  "@": path.join(root, "src"),
  "server-only": path.join(root, "node_modules/server-only/empty.js"),
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        resolve: { alias },
        test: {
          name: "db",
          include: ["tests/db/**/*.test.ts"],
          environment: "node",
          fileParallelism: false,
          hookTimeout: 120_000,
          testTimeout: 60_000,
          globalSetup: ["./tests/db/global-setup.ts"],
          setupFiles: ["./tests/db/setup.ts"],
        },
      },
    ],
  },
});
