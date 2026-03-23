// ESLint configuration for React Native/Expo project
module.exports = [
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "web/**",
      "*.generated.ts",
      "*.d.ts",
      "build/**",
      "dist/**",
      ".next/**"
    ]
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        console: "readonly",
        global: "readonly",
        __DEV__: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        navigator: "readonly",
        window: "readonly",
        document: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "no-console": "warn",
      "semi": "off",
      "quotes": "off"
    }
  },
  {
    files: ["**/__tests__/**/*.{js,jsx}", "**/*.test.{js,jsx}", "**/*.spec.{js,jsx}", "**/__mocks__/**/*.{js,jsx}"],
    languageOptions: {
      globals: {
        jest: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        device: "readonly",
        element: "readonly",
        by: "readonly",
        waitFor: "readonly"
      }
    },
    rules: {
      "no-console": "off",
      "no-undef": "off"
    }
  }
];