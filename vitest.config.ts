import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/helpers/setup.ts"],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'tests/**/*.ts',
        '**/*.d.ts',
        '**/*.config.ts',
        'app/**/*.tsx', // UI components
        '.next/**',
        'prisma/**',
      ],
      thresholds: {
        lines: 65,
        functions: 60,
        branches: 50,
        statements: 65,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
