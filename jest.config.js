/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/src/__tests__/**/*.test.ts'],
  // Sources import siblings as './x.js' (NodeNext); map them back to the .ts files
  moduleNameMapper: { '^(\.{1,2}/.*)\.js$': '$1' },
  globals: {
    'ts-jest': {
      tsconfig: { isolatedModules: true },
    },
  },
}
