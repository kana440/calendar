module.exports = {
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    semi: ['error', 'never'],
    'no-param-reassign': ['error', { props: false }],
    'no-unused-vars': ['error',{ 'vars': 'local' }],
  }
}
