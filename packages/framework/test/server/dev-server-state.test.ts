import path from "path"
import { loadFrontendState, loadBackendRouter, type FrontendState } from "../../src/server/dev-server-state.js"
import { buildRouterIfExists, componentifyRouter, pageRouterConfig, apiRouterConfig, resolveSpecialPages, type ComponentImport, type SpecialPageReferences } from "../../src/router/route-files.js"
import type { RouteNode } from "../../src/router/router.js"
import { type FileSystem } from "../../src/filesystem/index.js"
import { describe, test, expect, jest, beforeEach } from '@jest/globals'

// Mock the router functions
jest.mock('../../src/router/route-files.js')
const mockBuildRouterIfExists = buildRouterIfExists as jest.MockedFunction<typeof buildRouterIfExists>
const mockComponentifyRouter = componentifyRouter as jest.MockedFunction<typeof componentifyRouter>
const mockResolveSpecialPages = resolveSpecialPages as jest.MockedFunction<typeof resolveSpecialPages>

describe('dev-server-state', () => {
  let mockFileSystem: FileSystem

  beforeEach(() => {
    jest.clearAllMocks()
    mockFileSystem = {
      existsSync: jest.fn(),
      readFileSync: jest.fn(),
      writeFileSync: jest.fn(),
      readdirSync: jest.fn(),
      statSync: jest.fn(),
      mkdirSync: jest.fn(),
      unlinkSync: jest.fn(),
      rmdirSync: jest.fn(),
    } as any
  })

  describe('loadFrontendState', () => {
    test('should load frontend state with default file system', () => {
      const basePath = '/test/path'
      const mockRouter: RouteNode<string> = {
        staticChildren: new Map(),
        accept: true,
        names: {},
        stacks: {}
      }
      const mockImports: ComponentImport[] = [{ identifier: 'Test', importPath: 'test' }]
      const mockSpecialPages: SpecialPageReferences = {}

      mockBuildRouterIfExists.mockReturnValue(mockRouter)
      mockComponentifyRouter.mockReturnValue(mockImports)
      mockResolveSpecialPages.mockReturnValue(mockSpecialPages)

      const result = loadFrontendState(basePath)

      expect(mockBuildRouterIfExists).toHaveBeenCalledWith(basePath, 'src/pages', pageRouterConfig, expect.any(Object))
      expect(mockComponentifyRouter).toHaveBeenCalledWith(mockRouter, path.join(basePath, 'src/pages'))
      expect(mockResolveSpecialPages).toHaveBeenCalledWith(basePath, expect.any(Object))
      expect(result).toEqual({
        router: mockRouter,
        imports: mockImports,
        specialPages: mockSpecialPages
      })
    })

    test('should load frontend state with custom file system', () => {
      const basePath = '/test/path'
      const mockRouter: RouteNode<string> = {
        staticChildren: new Map(),
        accept: false,
        names: { page: 'Home' },
        stacks: {}
      }
      const mockImports: ComponentImport[] = []
      const mockSpecialPages: SpecialPageReferences = { error: { identifier: 'ErrorPage', importPath: 'error' } }

      mockBuildRouterIfExists.mockReturnValue(mockRouter)
      mockComponentifyRouter.mockReturnValue(mockImports)
      mockResolveSpecialPages.mockReturnValue(mockSpecialPages)

      const result = loadFrontendState(basePath, mockFileSystem)

      expect(mockBuildRouterIfExists).toHaveBeenCalledWith(basePath, 'src/pages', pageRouterConfig, mockFileSystem)
      expect(mockComponentifyRouter).toHaveBeenCalledWith(mockRouter, path.join(basePath, 'src/pages'))
      expect(mockResolveSpecialPages).toHaveBeenCalledWith(basePath, mockFileSystem)
      expect(result).toEqual({
        router: mockRouter,
        imports: mockImports,
        specialPages: mockSpecialPages
      })
    })

    test('should handle empty router', () => {
      const basePath = '/test/path'
      const mockRouter: RouteNode<string> = {
        staticChildren: new Map(),
        accept: false,
        names: {},
        stacks: {}
      }
      const mockImports: ComponentImport[] = []
      const mockSpecialPages: SpecialPageReferences = {}

      mockBuildRouterIfExists.mockReturnValue(mockRouter)
      mockComponentifyRouter.mockReturnValue(mockImports)
      mockResolveSpecialPages.mockReturnValue(mockSpecialPages)

      const result = loadFrontendState(basePath, mockFileSystem)

      expect(result.router).toBe(mockRouter)
      expect(result.imports).toEqual([])
      expect(result.specialPages).toBe(mockSpecialPages)
    })
  })

  describe('loadBackendRouter', () => {
    test('should load backend router with default file system', () => {
      const basePath = '/test/path'
      const mockRouter: RouteNode<string> = {
        staticChildren: new Map([['api', {
          staticChildren: new Map(),
          accept: true,
          names: { handler: 'apiHandler' },
          stacks: {}
        }]]),
        accept: false,
        names: {},
        stacks: {}
      }

      mockBuildRouterIfExists.mockReturnValue(mockRouter)

      const result = loadBackendRouter(basePath)

      expect(mockBuildRouterIfExists).toHaveBeenCalledWith(basePath, 'src/api', apiRouterConfig, expect.any(Object))
      expect(result).toBe(mockRouter)
    })

    test('should load backend router with custom file system', () => {
      const basePath = '/test/path'
      const mockRouter: RouteNode<string> = {
        staticChildren: new Map(),
        accept: true,
        names: {},
        stacks: {}
      }

      mockBuildRouterIfExists.mockReturnValue(mockRouter)

      const result = loadBackendRouter(basePath, mockFileSystem)

      expect(mockBuildRouterIfExists).toHaveBeenCalledWith(basePath, 'src/api', apiRouterConfig, mockFileSystem)
      expect(result).toBe(mockRouter)
    })

    test('should handle null router', () => {
      const basePath = '/test/path'
      const mockRouter: RouteNode<string> | null = null

      mockBuildRouterIfExists.mockReturnValue(mockRouter as any)

      const result = loadBackendRouter(basePath, mockFileSystem)

      expect(result).toBeNull()
    })
  })
})