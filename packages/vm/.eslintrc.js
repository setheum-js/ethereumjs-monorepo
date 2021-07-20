module.exports = {
  extends: '../../config/eslint.js',
  ignorePatterns: ['scripts', 'benchmarks', 'examples', 'karma.conf.js'],
  rules: {
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-unnecessary-condition': 'off',
    '@typescript-eslint/no-unused-vars': ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    'no-unused-vars': ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    'no-invalid-this': 'off',
    'no-restricted-syntax': 'off',
  },
  overrides: [
    {
      files: ['tests/**/*.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
}
