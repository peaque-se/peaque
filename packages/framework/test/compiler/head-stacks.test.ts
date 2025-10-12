import { describe, it, expect, beforeAll, beforeEach, jest } from "@jest/globals"

const mergeHeadMock = jest.fn()
const renderHeadMock = jest.fn(() => "<title>Processed</title>")
const registerSourceMapMock = jest.fn()

const colorMock = {
  gray: jest.fn((value: string) => value),
  bold: jest.fn((value: string) => value),
  red: jest.fn((value: string) => value),
  yellow: jest.fn((value: string) => value),
}

jest.mock("yoctocolors", () => ({
  __esModule: true,
  default: colorMock,
}))

jest.mock("../../src/client/head.js", () => ({
  mergeHead: mergeHeadMock,
  renderHead: renderHeadMock,
}))

const loadModuleMock = jest.fn()
const moduleInstances: any[] = []

class ModuleLoaderMock {
  constructor() {
    moduleInstances.push(this)
  }

  async loadModule(path: string) {
    return loadModuleMock(path)
  }
}

jest.mock("../../src/hmr/module-loader.js", () => ({
  ModuleLoader: ModuleLoaderMock,
}))

jest.mock("../../src/exceptions/sourcemaps.js", () => ({
  __esModule: true,
  registerSourceMap: registerSourceMapMock,
  setupSourceMaps: jest.fn(),
}))

let extractHeadStacks: typeof import("../../src/compiler/prod/head-stacks.js").extractHeadStacks

beforeAll(async () => {
  ;({ extractHeadStacks } = await import("../../src/compiler/prod/head-stacks.js"))
})

beforeEach(() => {
  loadModuleMock.mockReset().mockResolvedValue({ default: { title: "Child Page" } })
  mergeHeadMock.mockReset().mockImplementation((base, incoming) => ({ ...base, title: incoming.title }))
  renderHeadMock.mockReset().mockReturnValue("<title>Processed</title>")
  registerSourceMapMock.mockReset()
  Object.values(colorMock).forEach((fn) => (fn as jest.Mock).mockReset())
  moduleInstances.length = 0
})

const buildRouteNode = (options: Partial<any> = {}) => ({
  stacks: options.stacks,
  accept: options.accept ?? false,
  staticChildren: options.staticChildren ?? new Map(),
  paramChild: options.paramChild ?? null,
  wildcardChild: options.wildcardChild ?? null,
})

describe("extractHeadStacks", () => {
  it("aggregates head stacks for accepted routes and renders html", async () => {
    const router = buildRouteNode({
      accept: true,
      stacks: { heads: ["blog/post"] },
      staticChildren: new Map([
        [
          "admin",
          buildRouteNode({ accept: true, stacks: { heads: ["admin/dashboard"] } }),
        ],
      ]),
    })

    const results = await extractHeadStacks(router as any, "/app", "/app/pages", "assets-123")

    expect(moduleInstances).toHaveLength(1)
    const loadedPath = loadModuleMock.mock.calls[0][0].replace(/\\/g, "/")
    expect(loadedPath).toBe("/app/pages/blog/head.ts")
    expect(mergeHeadMock).toHaveBeenCalled()
    expect(renderHeadMock).toHaveBeenCalledWith(expect.any(Object), "/assets-123")

    const stacks = Array.from(results.values())
    expect(stacks).toHaveLength(2)
    expect(stacks[0]).toHaveProperty("html")
    expect(stacks[0]).toHaveProperty("headStack")
  })

  it("returns a default stack when no routes were processed", async () => {
    const router = buildRouteNode({ accept: false })

    const results = await extractHeadStacks(router as any, "/app", "/app/pages", "assets-123")

    expect(results.size).toBe(1)
    const entry = results.get("default")
    expect(entry?.headStack).toEqual([])
    expect(entry?.html).toContain('<script type="module" src="/assets-123/peaque.js"></script>')
  })

  it("logs a warning when a head module fails to load", async () => {
    const error = new Error("missing head")
    loadModuleMock.mockRejectedValueOnce(error)
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})

    const router = buildRouteNode({ accept: true, stacks: { heads: ["blog/post"] } })
    await extractHeadStacks(router as any, "/app", "/app/pages", "assets-123")

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Warning: Could not load head file"),
      error
    )

    warnSpy.mockRestore()
  })
})
