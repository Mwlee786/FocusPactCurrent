// eslint.config.mjs

import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import pluginReact from "eslint-plugin-react";
import pluginPrettier from "eslint-plugin-prettier";
import configPrettier from "eslint-config-prettier";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    // Apply this configuration to all JS, TS, JSX, and TSX files
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],

    // Define language options
    languageOptions: {
      globals: globals.browser, // Defines browser global variables
      parserOptions: {
        ecmaVersion: 2021, // Allows the parsing of modern ECMAScript features
        sourceType: "module", // Allows the use of imports
        ecmaFeatures: { jsx: true }, // Allows parsing of JSX
      },
    },

    // Register Prettier as a plugin
    plugins: {
      prettier: pluginPrettier,
    },

    // Define ESLint rules
    rules: {
      "prettier/prettier": "error", // Show Prettier errors as ESLint errors
      // You can add or override other ESLint rules here
      "react/react-in-jsx-scope": "off", // Not required with React 17+
    },
  },
  pluginJs.configs.recommended, // Include ESLint's recommended JS rules
  tseslint.configs.recommended, // Include TypeScript ESLint's recommended rules
  pluginReact.configs.recommended, // Include React ESLint's recommended rules
  configPrettier, // Integrate Prettier to disable conflicting ESLint rules
];