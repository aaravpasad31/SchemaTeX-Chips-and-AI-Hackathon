module.exports = {
  require: 'ts-node/register',
  extensions: ['ts'],
  spec: ['src/webview/**/*.test.ts', 'src/ast-analyzer/**/*.test.ts', 'src/test/**/*.test.ts'],
  timeout: 10000,
  exit: true
};
