import { serveSourceModule, handleRpcRequest, type ModuleContext } from "../../src/server/dev-server-modules.js"
import { fastRefreshify } from "../../src/compiler/fast-refreshify.js"
import { makeImportsRelative } from "../../src/compiler/imports.js"
import { makeRpcShim } from "../../src/server/make-rpc.js"
import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import path from 'path'

// Mock dependencies
jest.mock('../../src/compiler/fast-refreshify.js')
jest.mock('../../src/compiler/imports.js')
jest.mock('../../src/server/make-rpc.js')
jest.mock('superjson')

const mockFastRefreshify = fastRefreshify as jest.MockedFunction<typeof fastRefreshify>
const mockMakeImportsRelative = makeImportsRelative as jest.MockedFunction<typeof makeImportsRelative>
const mockMakeRpcShim = makeRpcShim as jest.MockedFunction<typeof makeRpcShim>
const mockSuperjson = require('superjson')

describe('dev-server-modules', () => {
  let mockReq: any
  let mockContext: ModuleContext

  beforeEach(() => {
    jest.clearAllMocks()
    mockReq = {
      path: jest.fn(),
      code: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      rawBody: jest.fn(),
      method: jest.fn().mockReturnValue('POST'),
      requestHeader: jest.fn()
    }
    const mockFileSystem = {
      existsSync: jest.fn(),
      readFileSync: jest.fn(),
      statSync: jest.fn().mockReturnValue({ isFile: jest.fn().mockReturnValue(true) })
    }
    const mockFileCache = {
      cacheByHash: jest.fn()
    }
    const mockRpcShimCache = {
      cacheByHash: jest.fn((key: string, hash: string, fn: () => Promise<any>) => fn())
    }
    const mockModuleLoader = {
      loadModule: jest.fn()
    }
    mockContext = {
      basePath: 'c:\\test\\path',
      moduleLoader: mockModuleLoader as any,
      moduleCache: mockFileCache as any,
      rpcShimCache: mockRpcShimCache as any,
      fileSystem: mockFileSystem
    }
  })

  describe('serveSourceModule', () => {
    test('should return 404 if file not found', async () => {
      mockReq.path.mockReturnValue('/@src/test')
      ;(mockContext.fileSystem!.existsSync as jest.Mock).mockReturnValue(false)

      await serveSourceModule(mockReq, mockContext)

      expect(mockReq.code).toHaveBeenCalledWith(404)
      expect(mockReq.send).toHaveBeenCalledWith('File not found')
    })

    test('should serve server module with RPC shim', async () => {
      mockReq.path.mockReturnValue('/@src/test.ts')
      ;(mockContext.fileSystem!.existsSync as jest.Mock).mockReturnValue(true)
      ;(mockContext.fileSystem!.readFileSync as jest.Mock).mockReturnValue("'use server'\ncode")
      mockMakeRpcShim.mockResolvedValue({ shim: 'shimmed code', path: 'test.ts', exportedFunctions: [] })
      mockMakeImportsRelative.mockReturnValue('processed code')

      await serveSourceModule(mockReq, mockContext)

      expect(mockMakeRpcShim).toHaveBeenCalledWith("'use server'\ncode", 'test.ts')
      expect(mockMakeImportsRelative).toHaveBeenCalledWith('shimmed code', 'test.ts')
      expect(mockReq.type).toHaveBeenCalledWith('application/javascript')
      expect(mockReq.send).toHaveBeenCalledWith('processed code')
    })

    test('should serve normal module with fast refresh', async () => {
      mockReq.path.mockReturnValue('/@src/test.tsx')
      ;(mockContext.fileSystem!.existsSync as jest.Mock).mockReturnValue(true)
      ;(mockContext.fileSystem!.readFileSync as jest.Mock).mockReturnValue('normal code')
      mockFastRefreshify.mockReturnValue('refreshified code')
      mockMakeImportsRelative.mockReturnValue('processed code')

      await serveSourceModule(mockReq, mockContext)

      expect(mockFastRefreshify).toHaveBeenCalledWith('normal code', '\\test.tsx')
      expect(mockMakeImportsRelative).toHaveBeenCalledWith('refreshified code', 'test.tsx')
      expect(mockReq.type).toHaveBeenCalledWith('application/javascript')
      expect(mockReq.send).toHaveBeenCalledWith('processed code')
    })

    test('should handle errors', async () => {
      mockReq.path.mockReturnValue('/@src/test.js')
      ;(mockContext.fileSystem!.existsSync as jest.Mock).mockReturnValue(true)
      ;(mockContext.fileSystem!.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('read error') })

      await serveSourceModule(mockReq, mockContext)

      expect(mockReq.type).toHaveBeenCalledWith('application/javascript')
      expect(mockReq.send).toHaveBeenCalledWith(expect.stringContaining('Error loading module \\test.js'))
    })

    test('should prevent path traversal attacks', async () => {
      mockReq.path.mockReturnValue('/@src/../../etc/passwd')
      ;(mockContext.fileSystem!.existsSync as jest.Mock).mockReturnValue(false)

      await serveSourceModule(mockReq, mockContext)

      expect(mockReq.code).toHaveBeenCalledWith(404)
      expect(mockReq.send).toHaveBeenCalledWith('File not found')
    })

    test('should resolve file with .ts extension', async () => {
      mockReq.path.mockReturnValue('/@src/component')
      ;(mockContext.fileSystem!.existsSync as jest.Mock).mockImplementation((p: string) =>
        p === path.resolve('c:\\test\\path\\component.ts')
      )
      ;(mockContext.fileSystem!.readFileSync as jest.Mock).mockReturnValue('export const x = 1')
      ;(mockContext.fileSystem!.statSync as jest.Mock).mockReturnValue({ isFile: jest.fn().mockReturnValue(true) })
      mockFastRefreshify.mockReturnValue('refreshified')
      mockMakeImportsRelative.mockReturnValue('processed')

      await serveSourceModule(mockReq, mockContext)

      expect(mockReq.send).toHaveBeenCalledWith('processed')
    })

    test('should resolve file with .jsx extension', async () => {
      mockReq.path.mockReturnValue('/@src/component')
      ;(mockContext.fileSystem!.existsSync as jest.Mock).mockImplementation((p: string) =>
        p === path.resolve('c:\\test\\path\\component.jsx')
      )
      ;(mockContext.fileSystem!.readFileSync as jest.Mock).mockReturnValue('export const x = 1')
      ;(mockContext.fileSystem!.statSync as jest.Mock).mockReturnValue({ isFile: jest.fn().mockReturnValue(true) })
      mockFastRefreshify.mockReturnValue('refreshified')
      mockMakeImportsRelative.mockReturnValue('processed')

      await serveSourceModule(mockReq, mockContext)

      expect(mockReq.send).toHaveBeenCalledWith('processed')
    })

    test('should resolve index.tsx in directory', async () => {
      mockReq.path.mockReturnValue('/@src/components/Button')
      ;(mockContext.fileSystem!.existsSync as jest.Mock).mockImplementation((p: string) =>
        p === path.resolve('c:\\test\\path\\components\\Button\\index.tsx')
      )
      ;(mockContext.fileSystem!.readFileSync as jest.Mock).mockReturnValue('export const Button = () => {}')
      ;(mockContext.fileSystem!.statSync as jest.Mock).mockReturnValue({ isFile: jest.fn().mockReturnValue(true) })
      mockFastRefreshify.mockReturnValue('refreshified')
      mockMakeImportsRelative.mockReturnValue('processed')

      await serveSourceModule(mockReq, mockContext)

      expect(mockReq.send).toHaveBeenCalledWith('processed')
    })

    test('should not serve directory as file', async () => {
      mockReq.path.mockReturnValue('/@src/components')
      ;(mockContext.fileSystem!.existsSync as jest.Mock).mockReturnValue(true)
      ;(mockContext.fileSystem!.statSync as jest.Mock).mockReturnValue({ isFile: jest.fn().mockReturnValue(false) })

      await serveSourceModule(mockReq, mockContext)

      expect(mockReq.code).toHaveBeenCalledWith(404)
      expect(mockReq.send).toHaveBeenCalledWith('File not found')
    })
  })

  describe('handleRpcRequest', () => {
    test('should return 404 if handler not found', async () => {
      mockReq.path.mockReturnValue('/api/__rpc/test/module')
      ;(mockContext.moduleCache.cacheByHash as jest.Mock).mockResolvedValue({})

      await handleRpcRequest(mockReq, mockContext)

      expect(mockReq.code).toHaveBeenCalledWith(404)
      expect(mockReq.send).toHaveBeenCalledWith('RPC handler not found')
    })

    test('should call RPC function and return result', async () => {
      mockReq.path.mockReturnValue('/api/__rpc/test/module/func')
      mockReq.rawBody.mockReturnValue(Buffer.from('{"args":[1,2]}'))
      const mockFunc = jest.fn().mockResolvedValue('result')
      ;(mockContext.moduleCache.cacheByHash as jest.Mock).mockResolvedValue({ func: mockFunc })
      mockSuperjson.parse.mockReturnValue({ args: [1, 2] })
      mockSuperjson.stringify.mockReturnValue('["result"]')

      await handleRpcRequest(mockReq, mockContext)

      expect(mockSuperjson.parse).toHaveBeenCalledWith('{"args":[1,2]}')
      expect(mockFunc).toHaveBeenCalledWith(1, 2)
      expect(mockSuperjson.stringify).toHaveBeenCalledWith('result')
      expect(mockReq.type).toHaveBeenCalledWith('application/json')
      expect(mockReq.send).toHaveBeenCalledWith('["result"]')
    })

    test('should handle RPC with no arguments', async () => {
      mockReq.path.mockReturnValue('/api/__rpc/test/module/func')
      mockReq.rawBody.mockReturnValue(Buffer.from('{"args":[]}'))
      const mockFunc = jest.fn().mockResolvedValue('no args result')
      ;(mockContext.moduleCache.cacheByHash as jest.Mock).mockResolvedValue({ func: mockFunc })
      mockSuperjson.parse.mockReturnValue({ args: [] })
      mockSuperjson.stringify.mockReturnValue('"no args result"')

      await handleRpcRequest(mockReq, mockContext)

      expect(mockFunc).toHaveBeenCalledWith()
      expect(mockReq.send).toHaveBeenCalledWith('"no args result"')
    })

    test('should handle RPC with complex nested paths', async () => {
      mockReq.path.mockReturnValue('/api/__rpc/src/services/user/getUserData')
      mockReq.rawBody.mockReturnValue(Buffer.from('{"args":[123]}'))
      const mockFunc = jest.fn().mockResolvedValue({ id: 123, name: 'Test' })
      ;(mockContext.moduleCache.cacheByHash as jest.Mock).mockResolvedValue({ getUserData: mockFunc })
      mockSuperjson.parse.mockReturnValue({ args: [123] })
      mockSuperjson.stringify.mockReturnValue('{"id":123,"name":"Test"}')

      await handleRpcRequest(mockReq, mockContext)

      expect(mockFunc).toHaveBeenCalledWith(123)
      expect(mockReq.send).toHaveBeenCalledWith('{"id":123,"name":"Test"}')
    })

    test('should return 404 if RPC function is not exported', async () => {
      mockReq.path.mockReturnValue('/api/__rpc/test/module/nonExistent')
      mockReq.rawBody.mockReturnValue(Buffer.from('{"args":[]}'))
      ;(mockContext.moduleCache.cacheByHash as jest.Mock).mockResolvedValue({ otherFunc: jest.fn() })

      await handleRpcRequest(mockReq, mockContext)

      expect(mockReq.code).toHaveBeenCalledWith(404)
      expect(mockReq.send).toHaveBeenCalledWith('RPC handler not found')
    })

    test('should return 404 if RPC target is not a function', async () => {
      mockReq.path.mockReturnValue('/api/__rpc/test/module/notAFunction')
      mockReq.rawBody.mockReturnValue(Buffer.from('{"args":[]}'))
      ;(mockContext.moduleCache.cacheByHash as jest.Mock).mockResolvedValue({ notAFunction: 'string value' })

      await handleRpcRequest(mockReq, mockContext)

      expect(mockReq.code).toHaveBeenCalledWith(404)
      expect(mockReq.send).toHaveBeenCalledWith('RPC handler not found')
    })

    test('should reject cross-site RPC requests', async () => {
      mockReq.path.mockReturnValue('/api/__rpc/test/module/func')
      mockReq.requestHeader.mockImplementation((name: string) => {
        if (name === 'sec-fetch-site') return 'cross-site'
        return undefined
      })

      await handleRpcRequest(mockReq, mockContext)

      expect(mockReq.code).toHaveBeenCalledWith(403)
      expect(mockReq.send).toHaveBeenCalledWith({ error: 'Forbidden: Cross-origin request rejected' })
    })

    test('should allow same-origin RPC requests', async () => {
      mockReq.path.mockReturnValue('/api/__rpc/test/module/func')
      mockReq.rawBody.mockReturnValue(Buffer.from('{"args":[1,2]}'))
      mockReq.requestHeader.mockImplementation((name: string) => {
        if (name === 'sec-fetch-site') return 'same-origin'
        return undefined
      })
      const mockFunc = jest.fn().mockResolvedValue('result')
      ;(mockContext.moduleCache.cacheByHash as jest.Mock).mockResolvedValue({ func: mockFunc })
      mockSuperjson.parse.mockReturnValue({ args: [1, 2] })
      mockSuperjson.stringify.mockReturnValue('["result"]')

      await handleRpcRequest(mockReq, mockContext)

      expect(mockFunc).toHaveBeenCalledWith(1, 2)
      expect(mockReq.send).toHaveBeenCalledWith('["result"]')
    })
  })
})