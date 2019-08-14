module.exports = {
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    semi: ['error', 'never'],
    'no-param-reassign': ['error', { props: false }],
    'no-var': 'off',
    'func-names': ['error','never'],
    'prefer-arrow-callback': 'off',
    'prefer-destructuring': 'off',
    'object-shorthand': 'off',
    'vars-on-top': "off",
  }
}
