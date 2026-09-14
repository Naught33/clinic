import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Console output is intentional here: the bug-report flow and debug
      // toasts log diagnostics locally (no backend yet), so we keep it on.
      "no-console": "off",
      // Context files intentionally export a provider component alongside a
      // useX() consumer hook — fast-refresh can't handle that pattern, but
      // splitting each into its own file would be needless indirection.
      "react-refresh/only-export-components": "off",
      eqeqeq: ["warn", "smart"],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // Keep interfaces (not type aliases) for object shapes, matching the
      // existing style in client.ts.
      "@typescript-eslint/consistent-type-definitions": ["warn", "interface"],
    },
  },
]);
