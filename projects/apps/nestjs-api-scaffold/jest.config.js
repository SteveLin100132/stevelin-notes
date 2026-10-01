/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  // allure-jest v3.x 以 Jest Environment 機制注入（非 reporters 陣列）
  // 取代原本的 'node'，自動將測試結果寫入 allure-results/
  testEnvironment: 'allure-jest/node',
  testEnvironmentOptions: {
    resultsDir: 'allure-results',
  },
  setupFiles: ['<rootDir>/test/jest-setup.js'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    'main\\.ts$',
    '\\.module\\.ts$',
    '\\.dto\\.ts$',
    'dist/',
  ],
  coverageThreshold: {
    'src/**/*.service.ts': {
      statements: 90,
    },
    'src/**/*.controller.ts': {
      statements: 90,
    },
  },
  testMatch: ['**/*.spec.ts'],
};
