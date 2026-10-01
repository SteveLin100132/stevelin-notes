/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  // allure-jest v3.x 以 Jest Environment 機制注入
  // e2e tests 位於 test/ 目錄，Allure 報告中以路徑自動區分 unit（src/）vs e2e（test/）
  testEnvironment: 'allure-jest/node',
  testEnvironmentOptions: {
    resultsDir: 'allure-results',
  },
  setupFiles: ['<rootDir>/test/jest-setup.js'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testMatch: ['**/test/**/*.e2e-spec.ts'],
};
