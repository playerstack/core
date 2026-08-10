module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  clearMocks: true,
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'json', 'clover', 'text'],
  coveragePathIgnorePatterns: ['node_modules', 'dist'],
  reporters: ['default', ['jest-junit', { outputDirectory: 'coverage', outputName: 'report.xml' }]],
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js'],
};
