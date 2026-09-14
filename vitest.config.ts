import { defineConfig } from "vitest/config";

// Unit-test config. Separate from vite.config.ts so the app's React/Babel
// plugins don't touch test transforms. Tests live next to the code they
// cover (`src/**/*.test.ts`).
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      include: ["src/lib/**"],
      reporter: ["text", "html"],
    },
  },
});
