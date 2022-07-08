module.exports = {
  env: {
    es2021: true,
    node: true
  },

  extends: ['plugin:@typescript-eslint/recommended', 'standard', 'prettier/@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  rules: {}
}
