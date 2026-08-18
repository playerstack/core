module.exports = {
  projects: [
    {
      displayName: 'hooks',
      preset: 'ts-jest',
      testEnvironment: 'node',
      clearMocks: true,
      testMatch: ['<rootDir>/test/hooks/**/*.spec.ts'],
      moduleFileExtensions: ['ts', 'js'],
    },
    {
      displayName: 'main',
      preset: 'ts-jest',
      testEnvironment: 'jest-environment-jsdom',
      clearMocks: true,
      collectCoverage: false,
      collectCoverageFrom: ['src/**/*.ts', '!src/types.ts', '!src/types/**', '!src/index.ts', '!src/utils/index.ts'],
      coverageDirectory: 'coverage',
      coverageReporters: ['lcov', 'json', 'clover', 'text'],
      coveragePathIgnorePatterns: ['node_modules', 'dist'],
      reporters: ['default', ['jest-junit', { outputDirectory: 'coverage', outputName: 'report.xml' }]],
      testMatch: ['<rootDir>/test/**/*.spec.ts'],
      testPathIgnorePatterns: ['<rootDir>/test/hooks/'],
      moduleFileExtensions: ['ts', 'js'],
    },
  ],
};
