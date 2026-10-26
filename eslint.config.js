const tseslint = require('typescript-eslint');

module.exports = [
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-unused-expressions": "warn",
      "no-var": "off",
      "prefer-const": "warn",
      "no-console": "off"
    }
  },
  {
    ignores: [
      "**/node_modules/**",
      "**/public/**",
      "**/resources/**",
      "themes/LoveIt/assets/**",
      "themes/LoveIt/exampleSite/**"
    ]
  }
];
