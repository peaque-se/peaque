import { servePeaqueCss, servePeaqueMainScript, servePeaqueLoaderScript, servePeaqueMainHtml, servePublicAsset } from "../../src/server/dev-server-static.js"
import { fastRefreshify } from "../../src/compiler/fast-refreshify.js"
import { makeImportsRelative } from "../../src/compiler/imports.js"
import { contentTypeRegistry } from "../../src/assets/asset-handler.js"
import { describe, test, expect, jest, beforeEach } from '@jest/globals'

// Mock dependencies
jest.mock('../../src/compiler/tailwind-bundler.js')
jest.mock('../../src/compiler/fast-refreshify.js')
jest.mock('../../src/compiler/imports.js')
jest.mock('../../src/assets/asset-handler.js')

const { bundleCssFile: mockBundleCssFile } = require('../../src/compiler/tailwind-bundler.js')
const mockFastRefreshify = fastRefreshify as jest.MockedFunction<typeof fastRefreshify>
const mockMakeImportsRelative = makeImportsRelative as jest.MockedFunction<typeof makeImportsRelative>
const mockContentTypeRegistry = contentTypeRegistry as jest.MockedObject<typeof contentTypeRegistry>

describe('dev-server-static', () => {
  let mockReq: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockReq = {
      code: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis()
    }
  })

  describe('servePeaqueCss', () => {
    test('should serve bundled CSS', async () => {
      const mockFileSystem = {
        existsSync: jest.fn().mockReturnValue(true),
        readFileSync: jest.fn().mockReturnValue('css content')
      }
      mockBundleCssFile.mockResolvedValue('bundled css')

      await servePeaqueCss(mockReq, 'base/path', mockFileSystem as any)

      expect(mockFileSystem.existsSync).toHaveBeenCalledWith('base\\path\\src\\styles.css')
      expect(mockFileSystem.readFileSync).toHaveBeenCalledWith('base\\path\\src\\styles.css', 'utf-8')
      expect(mockBundleCssFile).toHaveBeenCalledWith('css content', 'base/path')
      expect(mockReq.code).toHaveBeenCalledWith(200)
      expect(mockReq.header).toHaveBeenCalledWith('Content-Type', 'text/css')
      expect(mockReq.send).toHaveBeenCalledWith('bundled css')
    })

    test('should serve empty CSS if no styles.css', async () => {
      const mockFileSystem = {
        existsSync: jest.fn().mockReturnValue(false)
      }
      mockBundleCssFile.mockResolvedValue('bundled css')

      await servePeaqueCss(mockReq, 'base/path', mockFileSystem as any)

      expect(mockBundleCssFile).toHaveBeenCalledWith('', 'base/path')
    })
  })

  describe('servePeaqueMainScript', () => {
    test('should serve main script with port', () => {
      servePeaqueMainScript(mockReq, 3000)

      expect(mockReq.code).toHaveBeenCalledWith(200)
      expect(mockReq.header).toHaveBeenCalledWith('Content-Type', 'application/javascript')
      expect(mockReq.send).toHaveBeenCalledWith(expect.stringContaining('ws://localhost:3000/hmr'))
    })
  })

  describe('servePeaqueLoaderScript', () => {
    test('should serve loader script', () => {
      mockFastRefreshify.mockReturnValue('refreshified')
      mockMakeImportsRelative.mockReturnValue('processed')

      servePeaqueLoaderScript(mockReq)

      expect(mockFastRefreshify).toHaveBeenCalledWith(expect.stringContaining('createRoot'), 'peaque-loader.js')
      expect(mockMakeImportsRelative).toHaveBeenCalledWith('refreshified')
      expect(mockReq.type).toHaveBeenCalledWith('application/javascript')
      expect(mockReq.send).toHaveBeenCalledWith('processed')
    })
  })

  describe('servePeaqueMainHtml', () => {
    test('should serve main HTML', () => {
      servePeaqueMainHtml(mockReq)

      expect(mockReq.code).toHaveBeenCalledWith(200)
      expect(mockReq.header).toHaveBeenCalledWith('Content-Type', 'text/html')
      expect(mockReq.send).toHaveBeenCalledWith(expect.stringContaining('<title>Peaque App</title>'))
    })
  })

  describe('servePublicAsset', () => {
    test('should return false if file not found', () => {
      const mockFileSystem = {
        existsSync: jest.fn().mockReturnValue(false)
      }

      const result = servePublicAsset(mockReq, 'base/path', '/asset.js', mockFileSystem as any)

      expect(result).toBe(false)
    })

    test('should return false if not a file', () => {
      const mockFileSystem = {
        existsSync: jest.fn().mockReturnValue(true),
        statSync: jest.fn().mockReturnValue({ isFile: jest.fn().mockReturnValue(false) })
      }

      const result = servePublicAsset(mockReq, 'base/path', '/asset.js', mockFileSystem as any)

      expect(result).toBe(false)
    })

    test('should serve asset with correct content type', () => {
      const mockFileSystem = {
        existsSync: jest.fn().mockReturnValue(true),
        statSync: jest.fn().mockReturnValue({ isFile: jest.fn().mockReturnValue(true) }),
        accessSync: jest.fn(),
        readFileSync: jest.fn().mockReturnValue(Buffer.from('content'))
      }
      mockContentTypeRegistry['.js'] = 'application/javascript'

      const result = servePublicAsset(mockReq, 'base/path', '/asset.js', mockFileSystem as any)

      expect(result).toBe(true)
      expect(mockReq.code).toHaveBeenCalledWith(200)
      expect(mockReq.header).toHaveBeenCalledWith('Content-Type', 'application/javascript')
      expect(mockReq.send).toHaveBeenCalledWith(Buffer.from('content'))
    })

    test('should return 403 for forbidden path', () => {
      const result = servePublicAsset(mockReq, 'base/path', '../../../etc/passwd', {} as any)

      expect(result).toBe(true)
      expect(mockReq.code).toHaveBeenCalledWith(403)
      expect(mockReq.send).toHaveBeenCalledWith('Forbidden')
    })

    test('should handle files with no extension', () => {
      const mockFileSystem = {
        existsSync: jest.fn().mockReturnValue(true),
        statSync: jest.fn().mockReturnValue({ isFile: jest.fn().mockReturnValue(true) }),
        accessSync: jest.fn(),
        readFileSync: jest.fn().mockReturnValue(Buffer.from('content'))
      }

      const result = servePublicAsset(mockReq, 'base/path', '/README', mockFileSystem as any)

      expect(result).toBe(true)
      expect(mockReq.code).toHaveBeenCalledWith(200)
      expect(mockReq.send).toHaveBeenCalledWith(Buffer.from('content'))
    })

    test('should handle image assets correctly', () => {
      const mockFileSystem = {
        existsSync: jest.fn().mockReturnValue(true),
        statSync: jest.fn().mockReturnValue({ isFile: jest.fn().mockReturnValue(true) }),
        accessSync: jest.fn(),
        readFileSync: jest.fn().mockReturnValue(Buffer.from('binary image data'))
      }
      mockContentTypeRegistry['.png'] = 'image/png'

      const result = servePublicAsset(mockReq, 'base/path', '/assets/logo.png', mockFileSystem as any)

      expect(result).toBe(true)
      expect(mockReq.header).toHaveBeenCalledWith('Content-Type', 'image/png')
      expect(mockReq.send).toHaveBeenCalledWith(Buffer.from('binary image data'))
    })

    test('should handle CSS files', () => {
      const mockFileSystem = {
        existsSync: jest.fn().mockReturnValue(true),
        statSync: jest.fn().mockReturnValue({ isFile: jest.fn().mockReturnValue(true) }),
        accessSync: jest.fn(),
        readFileSync: jest.fn().mockReturnValue(Buffer.from('body { color: red; }'))
      }
      mockContentTypeRegistry['.css'] = 'text/css'

      const result = servePublicAsset(mockReq, 'base/path', '/styles/main.css', mockFileSystem as any)

      expect(result).toBe(true)
      expect(mockReq.header).toHaveBeenCalledWith('Content-Type', 'text/css')
    })
  })

  describe('servePeaqueCss edge cases', () => {
    test('should handle bundling errors gracefully', async () => {
      const mockFileSystem = {
        existsSync: jest.fn().mockReturnValue(true),
        readFileSync: jest.fn().mockReturnValue('css content')
      }
      mockBundleCssFile.mockRejectedValue(new Error('bundling failed'))

      await expect(servePeaqueCss(mockReq, 'base/path', mockFileSystem as any)).rejects.toThrow('bundling failed')
    })
  })

  describe('servePeaqueMainScript edge cases', () => {
    test('should generate correct WebSocket URL for different ports', () => {
      servePeaqueMainScript(mockReq, 8080)

      expect(mockReq.send).toHaveBeenCalledWith(expect.stringContaining('ws://localhost:8080/hmr'))
    })
  })

  describe('servePeaqueMainHtml edge cases', () => {
    test('should include all required meta tags', () => {
      servePeaqueMainHtml(mockReq)

      const sentHtml = (mockReq.send as jest.Mock).mock.calls[0][0]
      expect(sentHtml).toContain('<meta charset="UTF-8" />')
      expect(sentHtml).toContain('<meta name="viewport"')
      expect(sentHtml).toContain('<title>Peaque App</title>')
      expect(sentHtml).toContain('/peaque-dev.js')
      expect(sentHtml).toContain('/peaque.css')
      expect(sentHtml).toContain('<div id="peaque"></div>')
    })
  })
})