jest.mock('yoctocolors', () => ({
  default: {
    green: jest.fn((s) => s),
    yellow: jest.fn((s) => s),
    red: jest.fn((s) => s),
    bold: jest.fn((s) => s),
    underline: jest.fn((s) => s),
    gray: jest.fn((s) => s),
  },
}))

jest.mock("../../src/server/version.js", () => ({
  platformVersion: "1.0.0",
}))

jest.mock('@parcel/watcher', () => ({
  default: {
    subscribe: jest.fn(() => Promise.resolve({
      unsubscribe: jest.fn(() => Promise.resolve())
    }))
  }
}))

jest.mock('dotenv', () => ({
  config: jest.fn()
}))

jest.mock("../../src/compiler/bundle.js", () => ({
  setBaseDependencies: jest.fn(),
}))

import { DevServer } from "../../src/server/dev-server.js"
import { MockFileSystem } from "../../src/filesystem/index.js"
import { describe, test, expect, jest, beforeEach } from '@jest/globals'

describe('DevServer Integration Tests', () => {
  let mockFileSystem: MockFileSystem
  let basePath: string

  beforeEach(() => {
    jest.clearAllMocks()
    basePath = '/test/project'
    mockFileSystem = new MockFileSystem()

    // Setup basic file structure
    mockFileSystem.writeFileSync(`${basePath}/package.json`, JSON.stringify({
      name: 'test-project',
      dependencies: {
        'react': '^18.0.0',
        'react-dom': '^18.0.0'
      }
    }))
    mockFileSystem.writeFileSync(`${basePath}/src/pages/index.tsx`, 'export default function Home() {}')
    mockFileSystem.writeFileSync(`${basePath}/src/api/test.ts`, 'export const GET = () => {}')
    mockFileSystem.mkdirSync(`${basePath}/public`, { recursive: true })
  })

  describe('DevServer constructor', () => {
    test('should initialize with basic options', () => {
      const devServer = new DevServer({
        basePath,
        port: 3000,
        noStrict: false,
        fileSystem: mockFileSystem
      })

      expect(devServer).toBeDefined()
      expect(devServer.moduleContext()).toEqual({
        basePath,
        moduleLoader: expect.any(Object),
        moduleCache: expect.any(Object),
        fileSystem: mockFileSystem
      })
    })

    test('should initialize with noStrict mode', () => {
      const devServer = new DevServer({
        basePath,
        port: 3000,
        noStrict: true,
        fileSystem: mockFileSystem
      })

      expect(devServer).toBeDefined()
    })

    test('should parse tsconfig.json if exists', () => {
      mockFileSystem.writeFileSync(`${basePath}/tsconfig.json`, JSON.stringify({
        compilerOptions: {
          paths: {
            "@/*": ["./src/*"]
          }
        }
      }))

      const devServer = new DevServer({
        basePath,
        port: 3000,
        noStrict: false,
        fileSystem: mockFileSystem
      })

      expect(devServer).toBeDefined()
    })

    test('should handle invalid tsconfig.json gracefully', () => {
      mockFileSystem.writeFileSync(`${basePath}/tsconfig.json`, 'invalid json {')

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const devServer = new DevServer({
        basePath,
        port: 3000,
        noStrict: false,
        fileSystem: mockFileSystem
      })

      expect(devServer).toBeDefined()
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error parsing'),
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    test('should handle missing src directory', () => {
      const emptyFs = new MockFileSystem()

      const devServer = new DevServer({
        basePath: '/empty',
        port: 3000,
        noStrict: false,
        fileSystem: emptyFs
      })

      expect(devServer).toBeDefined()
    })
  })

  describe('DevServer file watching', () => {
    test('should not watch if src directory does not exist', () => {
      const emptyFs = new MockFileSystem()
      const watcher = require('@parcel/watcher').default

      const devServer = new DevServer({
        basePath: '/empty',
        port: 3000,
        noStrict: false,
        fileSystem: emptyFs
      })

      // start() would trigger watch, but we're just testing constructor behavior
      expect(watcher.subscribe).not.toHaveBeenCalled()
    })
  })

  describe('DevServer moduleContext', () => {
    test('should return correct module context', () => {
      const devServer = new DevServer({
        basePath,
        port: 3000,
        noStrict: false,
        fileSystem: mockFileSystem
      })

      const context = devServer.moduleContext()

      expect(context).toEqual({
        basePath,
        moduleLoader: expect.any(Object),
        moduleCache: expect.any(Object),
        fileSystem: mockFileSystem
      })
    })

    test('should maintain same context across calls', () => {
      const devServer = new DevServer({
        basePath,
        port: 3000,
        noStrict: false,
        fileSystem: mockFileSystem
      })

      const context1 = devServer.moduleContext()
      const context2 = devServer.moduleContext()

      expect(context1.basePath).toBe(context2.basePath)
      expect(context1.moduleLoader).toBe(context2.moduleLoader)
      expect(context1.moduleCache).toBe(context2.moduleCache)
    })
  })

  describe('DevServer with different ports', () => {
    test('should work with default port 3000', () => {
      const devServer = new DevServer({
        basePath,
        port: 3000,
        noStrict: false,
        fileSystem: mockFileSystem
      })

      expect(devServer).toBeDefined()
    })

    test('should work with custom port', () => {
      const devServer = new DevServer({
        basePath,
        port: 8080,
        noStrict: false,
        fileSystem: mockFileSystem
      })

      expect(devServer).toBeDefined()
    })
  })

  describe('DevServer with env files', () => {
    test('should load .env file if exists', () => {
      mockFileSystem.writeFileSync(`${basePath}/.env`, 'NODE_ENV=development')
      const dotenv = require('dotenv')

      const devServer = new DevServer({
        basePath,
        port: 3000,
        noStrict: false,
        fileSystem: mockFileSystem
      })

      expect(devServer).toBeDefined()
      expect(dotenv.config).toHaveBeenCalled()
    })

    test('should load .env.local file if exists', () => {
      mockFileSystem.writeFileSync(`${basePath}/.env.local`, 'SECRET=test')
      const dotenv = require('dotenv')

      const devServer = new DevServer({
        basePath,
        port: 3000,
        noStrict: false,
        fileSystem: mockFileSystem
      })

      expect(devServer).toBeDefined()
      expect(dotenv.config).toHaveBeenCalledTimes(2)
    })
  })

  describe('DevServer with special files', () => {
    test('should handle startup.ts file presence', () => {
      mockFileSystem.writeFileSync(`${basePath}/src/startup.ts`, 'console.log("startup")')

      const devServer = new DevServer({
        basePath,
        port: 3000,
        noStrict: false,
        fileSystem: mockFileSystem
      })

      expect(devServer).toBeDefined()
    })

    test('should handle middleware.ts file presence', () => {
      mockFileSystem.writeFileSync(`${basePath}/src/middleware.ts`, 'export const middleware = () => {}')

      const devServer = new DevServer({
        basePath,
        port: 3000,
        noStrict: false,
        fileSystem: mockFileSystem
      })

      expect(devServer).toBeDefined()
    })
  })

  describe('DevServer with fullStackTrace option', () => {
    test('should initialize with fullStackTrace enabled', () => {
      const devServer = new DevServer({
        basePath,
        port: 3000,
        noStrict: false,
        fullStackTrace: true,
        fileSystem: mockFileSystem
      })

      expect(devServer).toBeDefined()
    })

    test('should initialize with fullStackTrace disabled', () => {
      const devServer = new DevServer({
        basePath,
        port: 3000,
        noStrict: false,
        fullStackTrace: false,
        fileSystem: mockFileSystem
      })

      expect(devServer).toBeDefined()
    })
  })

  describe('DevServer with complex project structures', () => {
    test('should handle nested page routes', () => {
      mockFileSystem.writeFileSync(`${basePath}/src/pages/users/[id].tsx`, 'export default function UserPage() {}')
      mockFileSystem.writeFileSync(`${basePath}/src/pages/users/[id]/posts.tsx`, 'export default function UserPosts() {}')

      const devServer = new DevServer({
        basePath,
        port: 3000,
        noStrict: false,
        fileSystem: mockFileSystem
      })

      expect(devServer).toBeDefined()
    })

    test('should handle nested API routes', () => {
      mockFileSystem.writeFileSync(`${basePath}/src/api/v1/users.ts`, 'export const GET = () => {}')
      mockFileSystem.writeFileSync(`${basePath}/src/api/v1/posts/[id].ts`, 'export const GET = () => {}')

      const devServer = new DevServer({
        basePath,
        port: 3000,
        noStrict: false,
        fileSystem: mockFileSystem
      })

      expect(devServer).toBeDefined()
    })

    test('should handle projects with both middleware and startup', () => {
      mockFileSystem.writeFileSync(`${basePath}/src/middleware.ts`, 'export const middleware = () => {}')
      mockFileSystem.writeFileSync(`${basePath}/src/startup.ts`, 'console.log("init")')

      const devServer = new DevServer({
        basePath,
        port: 3000,
        noStrict: false,
        fileSystem: mockFileSystem
      })

      expect(devServer).toBeDefined()
    })
  })

  describe('DevServer with different configurations', () => {
    test('should work with high port numbers', () => {
      const devServer = new DevServer({
        basePath,
        port: 65535,
        noStrict: false,
        fileSystem: mockFileSystem
      })

      expect(devServer).toBeDefined()
    })

    test('should work with complex tsconfig paths', () => {
      mockFileSystem.writeFileSync(`${basePath}/tsconfig.json`, JSON.stringify({
        compilerOptions: {
          paths: {
            "@/*": ["./src/*"],
            "@components/*": ["./src/components/*"],
            "@utils/*": ["./src/utils/*"]
          }
        }
      }))

      const devServer = new DevServer({
        basePath,
        port: 3000,
        noStrict: false,
        fileSystem: mockFileSystem
      })

      expect(devServer).toBeDefined()
    })
  })
})
