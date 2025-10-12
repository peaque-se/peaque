import { describe, it, expect, jest } from "@jest/globals"
import { addAssetRoutesForFolder } from "../../src/assets/asset-handler.js"
import { MockFileSystem } from "../../src/filesystem/index.js"
import { Router } from "../../src/http/http-router.js"
import { PeaqueRequest } from "../../src/http/http-types.js"

describe("asset-handler", () => {
  describe("addAssetRoutesForFolder", () => {
    it("adds routes for all files in folder recursively", async () => {
      const fs = new MockFileSystem()
      fs.addFiles({
        "/assets": {
          "style.css": "body { color: red; }",
          "app.js": "console.log('hello');",
          "sub": {
            "image.png": "fake png data"
          }
        }
      })

      const router = {
        addRoute: jest.fn()
      } as unknown as Router

      const stats = await addAssetRoutesForFolder(router, "/assets", "/assets", false, false, fs)

      expect(router.addRoute).toHaveBeenCalledTimes(3)
      expect(router.addRoute).toHaveBeenCalledWith("GET", "/assets/style.css", expect.any(Function))
      expect(router.addRoute).toHaveBeenCalledWith("GET", "/assets/app.js", expect.any(Function))
      expect(router.addRoute).toHaveBeenCalledWith("GET", "/assets/sub/image.png", expect.any(Function))

      expect(stats.totalUncompressedBytes).toBe(
        Buffer.from("body { color: red; }").length +
        Buffer.from("console.log('hello');").length +
        Buffer.from("fake png data").length
      )
      expect(stats.totalBytesInMemory).toBe(stats.totalUncompressedBytes)
      expect(stats.totalGzipBytes).toBe(0)
      expect(stats.totalBrotliBytes).toBe(0)
    })

    it("loads compressed versions when available", async () => {
      const fs = new MockFileSystem()
      fs.addFiles({
        "/assets": {
          "style.css": "body { color: red; }",
          "style.css.gz": "gzipped css",
          "style.css.br": "brotli css"
        }
      })

      const router = {
        addRoute: jest.fn()
      } as unknown as Router

      const stats = await addAssetRoutesForFolder(router, "/assets", "/assets", false, false, fs)

      expect(router.addRoute).toHaveBeenCalledTimes(1)
      expect(router.addRoute).toHaveBeenCalledWith("GET", "/assets/style.css", expect.any(Function))

      expect(stats.totalUncompressedBytes).toBe(Buffer.from("body { color: red; }").length)
      expect(stats.totalGzipBytes).toBe(Buffer.from("gzipped css").length)
      expect(stats.totalBrotliBytes).toBe(Buffer.from("brotli css").length)
      expect(stats.totalBytesInMemory).toBe(
        stats.totalUncompressedBytes + stats.totalGzipBytes + stats.totalBrotliBytes
      )
    })

    it("adds routes without prefix when alsoServeWithoutPrefix is true", async () => {
      const fs = new MockFileSystem()
      fs.addFiles({
        "/assets": {
          "style.css": "body { color: red; }"
        }
      })

      const router = {
        addRoute: jest.fn()
      } as unknown as Router

      await addAssetRoutesForFolder(router, "/assets", "/assets", false, true, fs)

      expect(router.addRoute).toHaveBeenCalledTimes(2)
      expect(router.addRoute).toHaveBeenCalledWith("GET", "/assets/style.css", expect.any(Function))
      expect(router.addRoute).toHaveBeenCalledWith("GET", "/style.css", expect.any(Function))
    })

    it("skips compressed files in route creation", async () => {
      const fs = new MockFileSystem()
      fs.addFiles({
        "/assets": {
          "style.css": "body { color: red; }",
          "style.css.gz": Buffer.from("gzipped"),
          "style.css.br": Buffer.from("brotli")
        }
      })

      const router = {
        addRoute: jest.fn()
      } as unknown as Router

      await addAssetRoutesForFolder(router, "/assets", "/assets", false, false, fs)

      expect(router.addRoute).toHaveBeenCalledTimes(1)
      expect(router.addRoute).toHaveBeenCalledWith("GET", "/assets/style.css", expect.any(Function))
    })

    it("serves asset with correct content type and compression", async () => {
      const fs = new MockFileSystem()
      fs.addFiles({
        "/assets": {
          "style.css": "body { color: red; }",
          "style.css.gz": "gzipped css"
        }
      })

      const addRouteMock = jest.fn()
      const router = {
        addRoute: addRouteMock
      } as unknown as Router

      await addAssetRoutesForFolder(router, "/assets", "/assets", false, false, fs)

      const handler = addRouteMock.mock.calls[0][2] as (req: PeaqueRequest) => Promise<void>

      const req = {
        requestHeader: jest.fn().mockReturnValue("gzip"),
        type: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn()
      } as unknown as PeaqueRequest

      await handler(req)

      expect(req.type).toHaveBeenCalledWith("text/css")
      expect(req.header).toHaveBeenCalledWith("content-encoding", "gzip")
      expect(req.send).toHaveBeenCalledWith(Buffer.from("gzipped css"))
    })

    it("serves asset without compression when not supported", async () => {
      const fs = new MockFileSystem()
      fs.addFiles({
        "/assets": {
          "style.css": "body { color: red; }",
          "style.css.gz": "gzipped css"
        }
      })

      const addRouteMock = jest.fn()
      const router = {
        addRoute: addRouteMock
      } as unknown as Router

      await addAssetRoutesForFolder(router, "/assets", "/assets", false, false, fs)

      const handler = addRouteMock.mock.calls[0][2] as (req: PeaqueRequest) => Promise<void>

      const req = {
        requestHeader: jest.fn().mockReturnValue(""),
        type: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn()
      } as unknown as PeaqueRequest

      await handler(req)

      expect(req.type).toHaveBeenCalledWith("text/css")
      expect(req.header).not.toHaveBeenCalled()
      expect(req.send).toHaveBeenCalledWith(Buffer.from("body { color: red; }"))
    })

    it("sets long cache headers when enableLongCache is true", async () => {
      const fs = new MockFileSystem()
      fs.addFiles({
        "/assets": {
          "style.css": "body { color: red; }"
        }
      })

      const addRouteMock = jest.fn()
      const router = {
        addRoute: addRouteMock
      } as unknown as Router

      await addAssetRoutesForFolder(router, "/assets", "/assets", true, false, fs)

      const handler = addRouteMock.mock.calls[0][2] as (req: PeaqueRequest) => Promise<void>

      const req = {
        requestHeader: jest.fn().mockReturnValue(""),
        type: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn()
      } as unknown as PeaqueRequest

      await handler(req)

      expect(req.header).toHaveBeenCalledWith("cache-control", "public, max-age=31536000, immutable")
    })
  })
})