import { handleBackendApiRequest, type ApiContext } from "../../src/server/dev-server-api.js"
import { match, type RouteNode } from "../../src/router/router.js"
import { FileCache } from "../../src/server/file-cache.js"
import { ModuleLoader } from "../../src/hmr/module-loader.js"
import { executeMiddlewareChain } from "../../src/http/http-router.js"
import { describe, test, expect, jest, beforeEach } from '@jest/globals'

// Mock dependencies
jest.mock('../../src/http/http-router.js')
jest.mock('../../src/router/router.js')
jest.mock('../../src/server/file-cache.js')
jest.mock('../../src/hmr/module-loader.js')

const mockExecuteMiddlewareChain = executeMiddlewareChain as jest.MockedFunction<typeof executeMiddlewareChain>
const mockMatch = match as jest.MockedFunction<typeof match>

describe('dev-server-api', () => {
  let mockReq: any
  let mockContext: ApiContext

  beforeEach(() => {
    jest.clearAllMocks()
    mockReq = {
      path: jest.fn(),
      method: jest.fn(),
      code: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setPathParam: jest.fn()
    }
    const mockFileCache = {
      cacheByHash: jest.fn()
    }
    const mockModuleLoader = {
      loadExport: jest.fn(),
      loadModule: jest.fn()
    }
    mockContext = {
      backendRouter: {} as RouteNode<string>,
      basePath: '/test/path',
      moduleCache: mockFileCache as any,
      moduleLoader: mockModuleLoader as any
    }
  })

  describe('handleBackendApiRequest', () => {
    test('should return 404 if no route matches', async () => {
      mockReq.path.mockReturnValue('/api/test')
      mockMatch.mockReturnValue(null)

      await handleBackendApiRequest(mockReq, mockContext)

      expect(mockMatch).toHaveBeenCalledWith('/test', mockContext.backendRouter)
      expect(mockReq.code).toHaveBeenCalledWith(404)
      expect(mockReq.send).toHaveBeenCalledWith('Not Found')
    })

    test('should set path params if match has params', async () => {
      mockReq.path.mockReturnValue('/api/test')
      mockReq.method.mockReturnValue('get')
      const mockMatchResult = {
        params: { id: '123' },
        stacks: { middleware: [] },
        names: { handler: 'handler.js' },
        pattern: ''
      }
      mockMatch.mockReturnValue(mockMatchResult as any)
      mockContext.moduleCache.cacheByHash.mockResolvedValue({ GET: jest.fn() })

      await handleBackendApiRequest(mockReq, mockContext)

      expect(mockReq.setPathParam).toHaveBeenCalledWith('id', '123')
    })

    test('should load middlewares and execute handler', async () => {
      mockReq.path.mockReturnValue('/api/test')
      mockReq.method.mockReturnValue('post')
      const mockMatchResult = {
        params: {},
        stacks: { middleware: ['middleware1.js', 'middleware2.js'] },
        names: { handler: 'handler.js' },
        pattern: ''
      }
      mockMatch.mockReturnValue(mockMatchResult as any)
      const mockHandler = jest.fn()
      const mockMiddleware1 = jest.fn()
      const mockMiddleware2 = jest.fn()
      mockContext.moduleCache.cacheByHash
        .mockResolvedValueOnce(mockMiddleware1)
        .mockResolvedValueOnce(mockMiddleware2)
        .mockResolvedValueOnce({ POST: mockHandler })
      mockContext.moduleLoader.loadExport
        .mockResolvedValueOnce(mockMiddleware1)
        .mockResolvedValueOnce(mockMiddleware2)

      await handleBackendApiRequest(mockReq, mockContext)

      expect(mockContext.moduleCache.cacheByHash).toHaveBeenCalledTimes(3)
      expect(mockExecuteMiddlewareChain).toHaveBeenCalledWith(mockReq, [mockMiddleware1, mockMiddleware2], mockHandler)
    })

    test('should return 500 if no handler for method', async () => {
      mockReq.path.mockReturnValue('/api/test')
      mockReq.method.mockReturnValue('put')
      const mockMatchResult = {
        params: {},
        stacks: { middleware: [] },
        names: { handler: 'handler.js' },
        pattern: ''
      }
      mockMatch.mockReturnValue(mockMatchResult as any)
      mockContext.moduleCache.cacheByHash.mockResolvedValue({ GET: jest.fn() })

      await handleBackendApiRequest(mockReq, mockContext)

      expect(mockReq.code).toHaveBeenCalledWith(500)
      expect(mockReq.send).toHaveBeenCalledWith('No handler for this method')
    })

    test('should handle empty middleware stack', async () => {
      mockReq.path.mockReturnValue('/api/test')
      mockReq.method.mockReturnValue('get')
      const mockMatchResult = {
        params: {},
        stacks: { middleware: undefined },
        names: { handler: 'handler.js' },
        pattern: ''
      }
      mockMatch.mockReturnValue(mockMatchResult as any)
      const mockHandler = jest.fn()
      mockContext.moduleCache.cacheByHash.mockResolvedValue({ GET: mockHandler })

      await handleBackendApiRequest(mockReq, mockContext)

      expect(mockExecuteMiddlewareChain).toHaveBeenCalledWith(mockReq, [], mockHandler)
    })

    test('should handle handler that is not a function', async () => {
      mockReq.path.mockReturnValue('/api/test')
      mockReq.method.mockReturnValue('post')
      const mockMatchResult = {
        params: {},
        stacks: { middleware: [] },
        names: { handler: 'handler.js' },
        pattern: ''
      }
      mockMatch.mockReturnValue(mockMatchResult as any)
      mockContext.moduleCache.cacheByHash.mockResolvedValue({ POST: 'not a function' })

      await handleBackendApiRequest(mockReq, mockContext)

      expect(mockReq.code).toHaveBeenCalledWith(500)
      expect(mockReq.send).toHaveBeenCalledWith('No handler for this method')
    })

    test('should handle case-insensitive HTTP methods', async () => {
      mockReq.path.mockReturnValue('/api/test')
      mockReq.method.mockReturnValue('delete')
      const mockMatchResult = {
        params: {},
        stacks: { middleware: [] },
        names: { handler: 'handler.js' },
        pattern: ''
      }
      mockMatch.mockReturnValue(mockMatchResult as any)
      const mockHandler = jest.fn()
      mockContext.moduleCache.cacheByHash.mockResolvedValue({ DELETE: mockHandler })

      await handleBackendApiRequest(mockReq, mockContext)

      expect(mockExecuteMiddlewareChain).toHaveBeenCalledWith(mockReq, [], mockHandler)
    })

    test('should handle multiple path params correctly', async () => {
      mockReq.path.mockReturnValue('/api/users/123/posts/456')
      mockReq.method.mockReturnValue('get')
      const mockMatchResult = {
        params: { userId: '123', postId: '456' },
        stacks: { middleware: [] },
        names: { handler: 'handler.js' },
        pattern: ''
      }
      mockMatch.mockReturnValue(mockMatchResult as any)
      mockContext.moduleCache.cacheByHash.mockResolvedValue({ GET: jest.fn() })

      await handleBackendApiRequest(mockReq, mockContext)

      expect(mockReq.setPathParam).toHaveBeenCalledWith('userId', '123')
      expect(mockReq.setPathParam).toHaveBeenCalledWith('postId', '456')
    })

    test('should strip /api prefix correctly', async () => {
      mockReq.path.mockReturnValue('/api/test/path')
      mockMatch.mockReturnValue(null)

      await handleBackendApiRequest(mockReq, mockContext)

      expect(mockMatch).toHaveBeenCalledWith('/test/path', mockContext.backendRouter)
    })
  })
})