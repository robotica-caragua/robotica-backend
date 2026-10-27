export default [{ ignores: ['node_modules/**', 'coverage/**', '.local/**'] }, {
  files: ['src/**/*.js', 'test/**/*.js', 'scripts/**/*.js'],
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: {
    process: 'readonly', console: 'readonly', URL: 'readonly', Buffer: 'readonly', structuredClone: 'readonly',
  } },
  rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    'no-undef': 'error', 'no-unreachable': 'error', 'no-constant-condition': 'error' },
}]
