import { describe, it, expect, beforeAll, beforeEach } from "@jest/globals"
import { MockFileSystem } from "../../src/filesystem/index.js"

let rewriteAssetReferences: typeof import("../../src/assets/asset-rewriter.js").rewriteAssetReferences
let rewritePublicAssetReferences: typeof import("../../src/assets/asset-rewriter.js").rewritePublicAssetReferences
let fileSystem: MockFileSystem

beforeAll(async () => {
  const mod = await import("../../src/assets/asset-rewriter.js")
  rewriteAssetReferences = mod.rewriteAssetReferences
  rewritePublicAssetReferences = mod.rewritePublicAssetReferences
})

describe("rewriteAssetReferences", () => {
  beforeEach(() => {
    fileSystem = new MockFileSystem()
  })

  it("rewrites string literals and css url usages with the cache-busted prefix", () => {
    const code = `
      const imageA = "/images/logo.svg";
      const imageB = '/images/logo.svg';
      const tpl = \`/images/logo.svg\`;
      const css = "background: url(/images/logo.svg)";
    `
    const result = rewriteAssetReferences(code, new Set(["/images/logo.svg"]), "assets-123")

    expect(result).toContain(`"/assets-123/images/logo.svg"`)
    expect(result).toContain(`'/assets-123/images/logo.svg'`)
    expect(result).toContain("`/assets-123/images/logo.svg`")
    expect(result).toContain("url(/assets-123/images/logo.svg)")
  })

  it("matches longer asset paths before shorter ones to avoid partial replacements", () => {
    const code = `
      const withQuery = "/images/logo.svg?version=1";
      const basic = "/images/logo.svg";
    `
    const assetPaths = new Set(["/images/logo.svg", "/images/logo.svg?version=1"])
    const result = rewriteAssetReferences(code, assetPaths, "assets-xyz")

    expect(result).toContain(`"/assets-xyz/images/logo.svg?version=1"`)
    expect(result).toContain(`"/assets-xyz/images/logo.svg"`)
  })
})

describe("rewritePublicAssetReferences", () => {
  beforeEach(() => {
    fileSystem = new MockFileSystem()
  })

  it("loads asset paths from the public folder and rewrites matching references", async () => {
    fileSystem.mkdirSync("/fake/public/images", { recursive: true })
    fileSystem.writeFileSync("/fake/public/favicon.ico", "favicon")
    fileSystem.writeFileSync("/fake/public/ignore.txt.gz", "ignored")
    fileSystem.writeFileSync("/fake/public/images/logo.svg", "logo")
    fileSystem.writeFileSync("/fake/public/images/banner.png", "banner")
    fileSystem.writeFileSync("/fake/public/images/banner.png.br", "compressed")

    const code = `
      const favicon = "/favicon.ico";
      const logo = "/images/logo.svg";
      const banner = "url(/images/banner.png)";
      const ignored = "/ignore.txt.gz";
    `

    const result = await rewritePublicAssetReferences(code, "/fake/public", "assets-555", fileSystem)

    expect(result).toContain(`"/assets-555/favicon.ico"`)
    expect(result).toContain(`"/assets-555/images/logo.svg"`)
    expect(result).toContain(`url(/assets-555/images/banner.png)`)
    expect(result).toContain(`"/ignore.txt.gz"`)
  })

  it("returns the original code when the public folder is missing", async () => {
    const code = `const untouched = "/not-found.png"`
    const result = await rewritePublicAssetReferences(code, "/missing/public", "hash", fileSystem)

    expect(result).toBe(code)
  })
})
