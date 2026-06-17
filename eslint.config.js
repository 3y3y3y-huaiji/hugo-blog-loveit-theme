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
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off"
    }
  },
  {
    ignores: [
      "**/node_modules/**",
      "**/public/**",
      "**/resources/**",
      "themes/**"
    ]
  }
];
