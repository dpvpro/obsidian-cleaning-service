import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import tsEslint from "typescript-eslint";

export default defineConfig([
  // Ignore patterns (replaces .eslintignore)
  {
    ignores: ["node_modules/", "main.js", "dist/", "build/"],
  },

  // Base TypeScript recommended rules
  ...tsEslint.configs.recommended,

  // ObsidianMD recommended rules
  ...obsidianmd.configs.recommended,

  // Configuration for TypeScript source files
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
      globals: {
        app: "readonly",
        moment: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "obsidianmd/prefer-file-manager-trash-file": "off",
    },
  },

  // Configuration for JavaScript/Node files (esbuild config, version-bump)
  {
    files: ["**/*.mjs", "**/*.js"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // Configuration for package.json
  {
    files: ["**/package.json"],
    rules: {
      "depend/ban-dependencies": "off",
    },
  },
]);
