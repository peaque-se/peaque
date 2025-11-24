/** @type {import('jest').Config} */
export default {
  preset: null,
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  setupFiles: ['<rootDir>/test/setup.js'],
  moduleNameMapper: {
    '^../../src/compiler/tailwind-bundler.js$': '<rootDir>/test/__mocks__/tailwind-bundler.js',
    '^../compiler/tailwind-bundler.js$': '<rootDir>/test/__mocks__/tailwind-bundler.js',
    '^superjson$': '<rootDir>/test/__mocks__/superjson.js',
    '^oxc-parser$': '<rootDir>/test/__mocks__/oxc-parser.js',
    '^yoctocolors$': '<rootDir>/test/__mocks__/yoctocolors.js',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/test/**/*.test.ts',
    '<rootDir>/test/**/*.spec.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ESNext',
        target: 'ES2020'
      }
    }]
  },
  transformIgnorePatterns: [
    'node_modules/'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json']
};