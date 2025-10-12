import { describe, it, expect, beforeEach } from "@jest/globals"
import zlib from "node:zlib"
import path from "node:path"
import { precompressAssets } from "../../src/assets/precompress-assets.js"
import { MockFileSystem } from "../../src/filesystem/index.js"

const fixturePath = path.join("/", "workspace", "assets")
const filePath = path.join(fixturePath, "sample.txt")

describe("precompressAssets", () => {
  let fileSystem: MockFileSystem

  beforeEach(async () => {
    fileSystem = new MockFileSystem()
    await fileSystem.mkdir(fixturePath, { recursive: true })
    await fileSystem.writeFile(filePath, "hello world")
    const fixedDate = new Date("2024-01-01T08:00:00.000Z")
    await fileSystem.utimes(filePath, fixedDate, fixedDate)
  })

  it("compresses files and preserves original timestamps", async () => {
    const result = await precompressAssets(fixturePath, fileSystem)

    expect(result.files).toEqual([filePath])

    const originalStat = await fileSystem.stat(filePath)
    const gzipStat = await fileSystem.stat(`${filePath}.gz`)
    const brotliStat = await fileSystem.stat(`${filePath}.br`)

    expect(gzipStat.mtime.getTime()).toBe(originalStat.mtime.getTime())
    expect(brotliStat.mtime.getTime()).toBe(originalStat.mtime.getTime())

    const gzContent = await fileSystem.readFile(`${filePath}.gz`)
    const brContent = await fileSystem.readFile(`${filePath}.br`)

    expect(zlib.gunzipSync(gzContent).toString("utf-8")).toBe("hello world")
    expect(zlib.brotliDecompressSync(brContent).toString("utf-8")).toBe("hello world")
  })

  it("skips recompression when artifacts are up to date", async () => {
    await precompressAssets(fixturePath, fileSystem)

    const originalStat = await fileSystem.stat(filePath)
    await fileSystem.writeFile(`${filePath}.gz`, Buffer.from("stale gzip"))
    await fileSystem.writeFile(`${filePath}.br`, Buffer.from("stale brotli"))
    await fileSystem.utimes(`${filePath}.gz`, originalStat.atime, originalStat.mtime)
    await fileSystem.utimes(`${filePath}.br`, originalStat.atime, originalStat.mtime)

    await precompressAssets(fixturePath, fileSystem)

    const gzContent = await fileSystem.readFileText(`${filePath}.gz`, "utf-8")
    const brContent = await fileSystem.readFileText(`${filePath}.br`, "utf-8")

    expect(gzContent).toBe("stale gzip")
    expect(brContent).toBe("stale brotli")
  })
})
