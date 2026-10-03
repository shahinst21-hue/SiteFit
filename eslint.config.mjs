import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import ts from "typescript-eslint";

export default defineConfig([
  js.configs.recommended,
  ...ts.configs.recommended,
  globalIgnores([".next/**", "out/**", "coverage/**", "next-env.d.ts", "supabase/.temp/**"]),
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ group: ["**/scripts/**"], message: "Infrastructure scripts must never enter the application bundle." }],
      }],
    },
  },
]);
