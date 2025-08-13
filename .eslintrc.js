module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2021: true,
    jest: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 12
  },
  rules: {
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'camelcase': 'warn',
    'max-len': ['warn', { 'code': 100 }]
  }
};