// @ts-check

import js from "@eslint/js"
import { defineConfig, globalIgnores } from "eslint/config"
import eslintConfigPrettier from "eslint-config-prettier/flat"
import tseslint from "typescript-eslint"

export default defineConfig(
  globalIgnores([
    "playwright-report/**",
    "test-results/**",
    "blob-report/**",
    "playwright/.auth/**",
    "playwright/.cache/**",
  ]),
  {
    files: [
      "fixtures/**/*.ts",
      "pages/**/*.ts",
      "tests/**/*.ts",
      "utils/**/*.ts",
      "playwright.config.ts",
    ],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  eslintConfigPrettier,
)
