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
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
      globals: {
        // Obsidian plugin environment
        app: "readonly",
        moment: "readonly",
        // Browser environment
        window: "readonly",
        document: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
      },
    },
    rules: {
    	// Override TypeScript rules
     	"@typescript-eslint/no-unsafe-assignment": "off",

      	// Override ObsidianMD rules
      	"obsidianmd/prefer-file-manager-trash-file": "off",
      	"require-await": "error",

       	"obsidianmd/ui/sentence-case": [
         	"off",
         	{
          		// ignoreWords: ["YYYY-MM-DD"],
           		// brands: ["DP"],
          		acronyms: ["KB", "YYYY-MM-DD"],
         	},
       	],
    },
  },

  // Configuration for JavaScript/Node files (esbuild config, version-bump)
  {
    files: ["**/*.mjs", "**/*.js"],
    languageOptions: {
      globals: {
        // Node.js environment
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
