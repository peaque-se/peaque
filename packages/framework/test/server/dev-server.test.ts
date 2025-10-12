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

import { handleDevServerRequest, DevServerRequestContext } from "../../src/server/dev-server.js"
import { PeaqueRequest } from "../../src/http/http-types.js"
import { FrontendState } from "../../src/server/dev-server-state.js"
import { RouteNode } from "../../src/router/router.js"
import { ModuleContext } from "../../src/server/dev-server-modules.js"
import { FileSystem } from "../../src/filesystem/index.js"

jest.mock("../../src/compiler/bundle.js")
jest.mock("../../src/server/dev-server-modules.js")
jest.mock("../../src/server/dev-server-api.js")
jest.mock("../../src/server/dev-server-static.js")
jest.mock("../../src/server/dev-server-view.js")
jest.mock("../../src/hmr/hmr-handler.js")

describe('handleDevServerRequest', () => {
  let mockReq: jest.Mocked<PeaqueRequest>
  let context: DevServerRequestContext
  let mockFrontendState: FrontendState
  let mockBackendRouter: RouteNode<string>
  let mockModuleContext: ModuleContext
  let mockFileSystem: FileSystem

  beforeEach(() => {
    jest.clearAllMocks()

    mockFrontendState = {} as FrontendState
    mockBackendRouter = {} as RouteNode<string>
    mockFileSystem = {
      existsSync: jest.fn(),
      readFileSync: jest.fn(),
    } as any
    mockModuleContext = {
      basePath: '/test',
      moduleLoader: {} as any,
      moduleCache: {},
      fileSystem: mockFileSystem,
    } as ModuleContext

    mockReq = {
      path: jest.fn(),
      code: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      send: jest.fn(),
      type: jest.fn().mockReturnThis(),
    } as any

    context = {
      basePath: '/test',
      port: 3000,
      noStrict: false,
      frontendState: mockFrontendState,
      backendRouter: mockBackendRouter,
      moduleContext: mockModuleContext,
      fileSystem: mockFileSystem,
    }
  })

  it('should handle /@src/ requests', async () => {
    mockReq.path.mockReturnValue('/@src/app.js')
    ;(require("../../src/server/dev-server-modules.js").serveSourceModule as jest.Mock).mockResolvedValue(undefined)

    await handleDevServerRequest(mockReq, context)

    expect(require("../../src/server/dev-server-modules.js").serveSourceModule).toHaveBeenCalledWith(mockReq, mockModuleContext)
  })

  it('should handle /api/__rpc/ requests', async () => {
    mockReq.path.mockReturnValue('/api/__rpc/test')
    ;(require("../../src/server/dev-server-modules.js").handleRpcRequest as jest.Mock).mockResolvedValue(undefined)

    await handleDevServerRequest(mockReq, context)

    expect(require("../../src/server/dev-server-modules.js").handleRpcRequest).toHaveBeenCalledWith(mockReq, mockModuleContext)
  })

  it('should handle /api/ requests', async () => {
    mockReq.path.mockReturnValue('/api/test')
    ;(require("../../src/server/dev-server-api.js").handleBackendApiRequest as jest.Mock).mockResolvedValue(undefined)

    await handleDevServerRequest(mockReq, context)

    expect(require("../../src/server/dev-server-api.js").handleBackendApiRequest).toHaveBeenCalledWith(mockReq, {
      backendRouter: mockBackendRouter,
      basePath: '/test',
      moduleCache: mockModuleContext.moduleCache,
      moduleLoader: mockModuleContext.moduleLoader,
    })
  })

  it('should handle /peaque-dev.js', async () => {
    mockReq.path.mockReturnValue('/peaque-dev.js')
    ;(require("../../src/server/dev-server-static.js").servePeaqueMainScript as jest.Mock).mockReturnValue(undefined)

    await handleDevServerRequest(mockReq, context)

    expect(require("../../src/server/dev-server-static.js").servePeaqueMainScript).toHaveBeenCalledWith(mockReq, 3000)
  })

  it('should handle /peaque-loader.js', async () => {
    mockReq.path.mockReturnValue('/peaque-loader.js')
    ;(require("../../src/server/dev-server-static.js").servePeaqueLoaderScript as jest.Mock).mockReturnValue(undefined)

    await handleDevServerRequest(mockReq, context)

    expect(require("../../src/server/dev-server-static.js").servePeaqueLoaderScript).toHaveBeenCalledWith(mockReq)
  })

  it('should handle /peaque.js', async () => {
    mockReq.path.mockReturnValue('/peaque.js')
    ;(require("../../src/server/dev-server-view.js").createDevRouterModule as jest.Mock).mockReturnValue('router js')

    await handleDevServerRequest(mockReq, context)

    expect(require("../../src/server/dev-server-view.js").createDevRouterModule).toHaveBeenCalledWith(mockFrontendState, true)
    expect(mockReq.type).toHaveBeenCalledWith('application/javascript')
    expect(mockReq.send).toHaveBeenCalledWith('router js')
  })

  it('should handle /peaque.css', async () => {
    mockReq.path.mockReturnValue('/peaque.css')
    ;(require("../../src/server/dev-server-static.js").servePeaqueCss as jest.Mock).mockResolvedValue(undefined)

    await handleDevServerRequest(mockReq, context)

    expect(require("../../src/server/dev-server-static.js").servePeaqueCss).toHaveBeenCalledWith(mockReq, '/test', mockFileSystem)
  })

  it('should handle /hmr', async () => {
    mockReq.path.mockReturnValue('/hmr')
    ;(require("../../src/hmr/hmr-handler.js").hmrConnectHandler as jest.Mock).mockResolvedValue(undefined)

    await handleDevServerRequest(mockReq, context)

    expect(require("../../src/hmr/hmr-handler.js").hmrConnectHandler).toHaveBeenCalledWith(mockReq)
  })

  it('should handle public assets', async () => {
    mockReq.path.mockReturnValue('/public/test.png')
    ;(require("../../src/server/dev-server-static.js").servePublicAsset as jest.Mock).mockReturnValue(true)

    await handleDevServerRequest(mockReq, context)

    expect(require("../../src/server/dev-server-static.js").servePublicAsset).toHaveBeenCalledWith(mockReq, '/test', '/public/test.png', mockFileSystem)
  })

  it('should handle main html for unmatched paths', async () => {
    mockReq.path.mockReturnValue('/unknown')
    ;(require("../../src/server/dev-server-static.js").servePublicAsset as jest.Mock).mockReturnValue(false)
    ;(require("../../src/server/dev-server-static.js").servePeaqueMainHtml as jest.Mock).mockReturnValue(undefined)

    await handleDevServerRequest(mockReq, context)

    expect(require("../../src/server/dev-server-static.js").servePeaqueMainHtml).toHaveBeenCalledWith(mockReq)
  })


  it('should respect noStrict setting when creating router module with false', async () => {
    context.noStrict = true
    mockReq.path.mockReturnValue('/peaque.js')
    ;(require("../../src/server/dev-server-view.js").createDevRouterModule as jest.Mock).mockReturnValue('router js no strict')

    await handleDevServerRequest(mockReq, context)

    // When noStrict is true, strict mode should be false (inverted)
    expect(require("../../src/server/dev-server-view.js").createDevRouterModule).toHaveBeenCalledWith(mockFrontendState, false)
    expect(mockReq.send).toHaveBeenCalledWith('router js no strict')
  })

  it('should respect noStrict setting when creating router module with true', async () => {
    context.noStrict = false
    mockReq.path.mockReturnValue('/peaque.js')
    ;(require("../../src/server/dev-server-view.js").createDevRouterModule as jest.Mock).mockReturnValue('router js strict')

    await handleDevServerRequest(mockReq, context)

    // When noStrict is false, strict mode should be true (inverted)
    expect(require("../../src/server/dev-server-view.js").createDevRouterModule).toHaveBeenCalledWith(mockFrontendState, true)
    expect(mockReq.send).toHaveBeenCalledWith('router js strict')
  })

  it('should handle /@deps/ requests', async () => {
    mockReq.path.mockReturnValue('/@deps/react')

    // Mock the dynamic import of bundle.js
    jest.isolateModules(() => {
      jest.doMock("../../src/compiler/bundle.js", () => ({
        bundleModuleFromNodeModules: jest.fn().mockResolvedValue('bundled react code')
      }))
    })

    const { bundleModuleFromNodeModules } = require("../../src/compiler/bundle.js")
    bundleModuleFromNodeModules.mockResolvedValue('bundled react code')

    await handleDevServerRequest(mockReq, context)

    expect(mockReq.code).toHaveBeenCalledWith(200)
    expect(mockReq.header).toHaveBeenCalledWith('Content-Type', 'application/javascript')
    expect(mockReq.send).toHaveBeenCalledWith('bundled react code')
  })

  it('should handle /@deps/ requests for scoped packages', async () => {
    mockReq.path.mockReturnValue('/@deps/@testing-library/react')

    const { bundleModuleFromNodeModules } = require("../../src/compiler/bundle.js")
    bundleModuleFromNodeModules.mockResolvedValue('bundled @testing-library/react code')

    await handleDevServerRequest(mockReq, context)

    expect(bundleModuleFromNodeModules).toHaveBeenCalledWith(
      '@testing-library/react',
      '/test',
      mockFileSystem
    )
    expect(mockReq.code).toHaveBeenCalledWith(200)
    expect(mockReq.send).toHaveBeenCalledWith('bundled @testing-library/react code')
  })

  it('should extract module name correctly from /@deps/ path', async () => {
    mockReq.path.mockReturnValue('/@deps/lodash/debounce')

    const { bundleModuleFromNodeModules } = require("../../src/compiler/bundle.js")
    bundleModuleFromNodeModules.mockResolvedValue('bundled lodash/debounce code')

    await handleDevServerRequest(mockReq, context)

    expect(bundleModuleFromNodeModules).toHaveBeenCalledWith(
      'lodash/debounce',
      '/test',
      mockFileSystem
    )
  })

  it('should handle /@deps/ bundle errors gracefully', async () => {
    mockReq.path.mockReturnValue('/@deps/nonexistent-package')

    const { bundleModuleFromNodeModules } = require("../../src/compiler/bundle.js")
    bundleModuleFromNodeModules.mockRejectedValue(new Error('Module not found'))

    await expect(handleDevServerRequest(mockReq, context)).rejects.toThrow('Module not found')
  })

  it('should handle /@src/ requests with query parameters', async () => {
    mockReq.path.mockReturnValue('/@src/app.js?v=123')
    ;(require("../../src/server/dev-server-modules.js").serveSourceModule as jest.Mock).mockResolvedValue(undefined)

    await handleDevServerRequest(mockReq, context)

    expect(require("../../src/server/dev-server-modules.js").serveSourceModule).toHaveBeenCalledWith(mockReq, mockModuleContext)
  })

  it('should handle /api/__rpc/ with nested paths', async () => {
    mockReq.path.mockReturnValue('/api/__rpc/users/get')
    ;(require("../../src/server/dev-server-modules.js").handleRpcRequest as jest.Mock).mockResolvedValue(undefined)

    await handleDevServerRequest(mockReq, context)

    expect(require("../../src/server/dev-server-modules.js").handleRpcRequest).toHaveBeenCalledWith(mockReq, mockModuleContext)
  })

  it('should handle /api/ with nested resource paths', async () => {
    mockReq.path.mockReturnValue('/api/users/123/posts')
    ;(require("../../src/server/dev-server-api.js").handleBackendApiRequest as jest.Mock).mockResolvedValue(undefined)

    await handleDevServerRequest(mockReq, context)

    expect(require("../../src/server/dev-server-api.js").handleBackendApiRequest).toHaveBeenCalledWith(mockReq, {
      backendRouter: mockBackendRouter,
      basePath: '/test',
      moduleCache: mockModuleContext.moduleCache,
      moduleLoader: mockModuleContext.moduleLoader,
    })
  })

  it('should handle empty path', async () => {
    mockReq.path.mockReturnValue('')
    ;(require("../../src/server/dev-server-static.js").servePublicAsset as jest.Mock).mockReturnValue(false)
    ;(require("../../src/server/dev-server-static.js").servePeaqueMainHtml as jest.Mock).mockReturnValue(undefined)

    await handleDevServerRequest(mockReq, context)

    expect(require("../../src/server/dev-server-static.js").servePeaqueMainHtml).toHaveBeenCalledWith(mockReq)
  })

  it('should handle root path /', async () => {
    mockReq.path.mockReturnValue('/')
    ;(require("../../src/server/dev-server-static.js").servePublicAsset as jest.Mock).mockReturnValue(false)
    ;(require("../../src/server/dev-server-static.js").servePeaqueMainHtml as jest.Mock).mockReturnValue(undefined)

    await handleDevServerRequest(mockReq, context)

    expect(require("../../src/server/dev-server-static.js").servePeaqueMainHtml).toHaveBeenCalledWith(mockReq)
  })

  it('should handle public assets with various extensions', async () => {
    const testCases = [
      '/public/test.png',
      '/public/test.jpg',
      '/public/test.svg',
      '/public/test.ico',
      '/public/test.woff2',
      '/public/test.json'
    ]

    for (const testPath of testCases) {
      mockReq.path.mockReturnValue(testPath)
      ;(require("../../src/server/dev-server-static.js").servePublicAsset as jest.Mock).mockReturnValue(true)

      await handleDevServerRequest(mockReq, context)

      expect(require("../../src/server/dev-server-static.js").servePublicAsset).toHaveBeenCalledWith(mockReq, '/test', testPath, mockFileSystem)
    }
  })

  it('should handle deeply nested public assets', async () => {
    mockReq.path.mockReturnValue('/public/assets/images/icons/logo.png')
    ;(require("../../src/server/dev-server-static.js").servePublicAsset as jest.Mock).mockReturnValue(true)

    await handleDevServerRequest(mockReq, context)

    expect(require("../../src/server/dev-server-static.js").servePublicAsset).toHaveBeenCalledWith(mockReq, '/test', '/public/assets/images/icons/logo.png', mockFileSystem)
  })

  it('should handle frontend routes (SPA fallback)', async () => {
    const testRoutes = ['/about', '/users/123', '/dashboard/settings']

    for (const route of testRoutes) {
      jest.clearAllMocks()
      mockReq.path.mockReturnValue(route)
      ;(require("../../src/server/dev-server-static.js").servePublicAsset as jest.Mock).mockReturnValue(false)
      ;(require("../../src/server/dev-server-static.js").servePeaqueMainHtml as jest.Mock).mockReturnValue(undefined)

      await handleDevServerRequest(mockReq, context)

      expect(require("../../src/server/dev-server-static.js").servePeaqueMainHtml).toHaveBeenCalledWith(mockReq)
    }
  })

  it('should handle request paths with special characters', async () => {
    mockReq.path.mockReturnValue('/public/file%20with%20spaces.txt')
    ;(require("../../src/server/dev-server-static.js").servePublicAsset as jest.Mock).mockReturnValue(true)

    await handleDevServerRequest(mockReq, context)

    expect(require("../../src/server/dev-server-static.js").servePublicAsset).toHaveBeenCalled()
  })

  it('should handle /@deps/ with deeply nested scoped packages', async () => {
    mockReq.path.mockReturnValue('/@deps/@babel/core/lib/index')

    const { bundleModuleFromNodeModules } = require("../../src/compiler/bundle.js")
    bundleModuleFromNodeModules.mockResolvedValue('bundled @babel/core/lib/index code')

    await handleDevServerRequest(mockReq, context)

    expect(bundleModuleFromNodeModules).toHaveBeenCalledWith(
      '@babel/core/lib/index',
      '/test',
      mockFileSystem
    )
  })

  it('should maintain correct module cache across requests', async () => {
    mockReq.path.mockReturnValue('/@src/utils.js')
    ;(require("../../src/server/dev-server-modules.js").serveSourceModule as jest.Mock).mockResolvedValue(undefined)

    await handleDevServerRequest(mockReq, context)
    await handleDevServerRequest(mockReq, context)

    // Should use the same module context/cache for both requests
    expect(require("../../src/server/dev-server-modules.js").serveSourceModule).toHaveBeenCalledTimes(2)
    expect(require("../../src/server/dev-server-modules.js").serveSourceModule).toHaveBeenCalledWith(mockReq, mockModuleContext)
  })

  it('should handle concurrent requests correctly', async () => {
    const req1 = { ...mockReq, path: jest.fn().mockReturnValue('/@src/app.js') } as any
    const req2 = { ...mockReq, path: jest.fn().mockReturnValue('/@src/utils.js') } as any
    ;(require("../../src/server/dev-server-modules.js").serveSourceModule as jest.Mock).mockResolvedValue(undefined)

    await Promise.all([
      handleDevServerRequest(req1, context),
      handleDevServerRequest(req2, context)
    ])

    expect(require("../../src/server/dev-server-modules.js").serveSourceModule).toHaveBeenCalledTimes(2)
  })
})