import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from "@jest/globals"
import * as fs from "fs"

const readFileMock = jest.fn<Promise<string>, [string, string]>()
let readFileSpy: jest.SpyInstance
let reactCompilerPlugin: typeof import("../../src/compiler/react-compiler-plugin.js").reactCompilerPlugin

beforeAll(async () => {
  ;({ reactCompilerPlugin } = await import("../../src/compiler/react-compiler-plugin.js"))
})

beforeEach(() => {
  readFileMock.mockReset()
  readFileMock.mockResolvedValue("// component source")
  readFileSpy = jest.spyOn(fs.promises, "readFile").mockImplementation((...args) =>
    readFileMock(...(args as [string, string]))
  )
})

afterEach(() => {
  readFileSpy.mockRestore()
})

const createBuild = () => {
  const onLoad = jest.fn()
  return {
    onLoad,
    getHandler() {
      const [, handler] = onLoad.mock.calls[0] || []
      return handler as (args: { path: string }) => Promise<any>
    },
  }
}

describe("reactCompilerPlugin", () => {
  it("skips registration when disabled", () => {
    const build = createBuild()
    const plugin = reactCompilerPlugin({ enabled: false })

    plugin.setup(build as any)

    expect(build.onLoad).not.toHaveBeenCalled()
  })

  it("transforms matching files via Babel and returns compiled contents", async () => {
    const build = createBuild()
    const plugin = reactCompilerPlugin({ compilationMode: "all" })
    plugin.setup(build as any)

    const handler = build.getHandler()
    expect(handler).toBeInstanceOf(Function)

    readFileMock.mockResolvedValueOnce("const Component = () => <div />")

    const result = await handler({ path: "/workspace/src/component.tsx" })

    expect(readFileMock).toHaveBeenCalledWith("/workspace/src/component.tsx", "utf8")
    expect(result?.loader).toBe("tsx")
    expect(result?.contents).toEqual(expect.stringContaining("react/compiler-runtime"))
  })

  it("ignores files inside node_modules", async () => {
    const build = createBuild()
    const plugin = reactCompilerPlugin()
    plugin.setup(build as any)

    const handler = build.getHandler()
    const result = await handler({ path: "/workspace/node_modules/lib/index.tsx" })

    expect(result).toBeNull()
    expect(readFileMock).not.toHaveBeenCalled()
  })

  it("returns null and logs a warning when transformation fails", async () => {
    const build = createBuild()
    const plugin = reactCompilerPlugin({ compilationMode: "strict" })
    plugin.setup(build as any)

    const handler = build.getHandler()
    readFileMock.mockResolvedValueOnce("const Component = () => <div />")
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})

    const result = await handler({ path: "/workspace/src/component.tsx" })

    expect(result).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      "React Compiler warning for /workspace/src/component.tsx:",
      expect.any(Error)
    )

    warnSpy.mockRestore()
  })
})
