module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json', 'tsconfig.dev.json'],
    sourceType: 'module',
  },
  ignorePatterns: [
    '/lib/**/*', // Ignore built files.
    '/generated/**/*', // Ignore generated files.
  ],
  plugins: ['@typescript-eslint', 'import', 'prettier'],
  rules: {
    'prettier/prettier': 'error',
    quotes: ['error', 'single'],
    'import/no-unresolved': 0,
    'object-curly-spacing': 0,
    'require-jsdoc': 0,
    'valid-jsdoc': 0,
    'no-explicit-any': 0,
    'operator-linebreak': 0,
    'space-before-function-paren': 0,
    'arrow-spacing': 0,
    'max-len': 0,
    'function-paren-newline': 0,
    'array-element-newline': 0,
    'object-property-newline': 0,
    'object-curly-newline': 0,
    'import/newline-after-import': 0,
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
      },
    ],
    'import/no-duplicates': 'error',
  },
};
