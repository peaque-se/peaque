import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from "@jest/globals"
import path from "path"
import type { FileSystem } from "../../src/filesystem/file-system.js"

const buildForProductionMock = jest.fn<
  Promise<void>,
  [string, string, boolean, boolean, boolean, boolean, boolean]
>()
const devServerConstructorMock = jest.fn<(options: Record<string, unknown>) => void>()
const devServerStartMock = jest.fn<Promise<void>, []>()
const devServerStopMock = jest.fn<void, [string]>()
let devServerInstance: { start: typeof devServerStartMock; stop: typeof devServerStopMock }

jest.mock("../../src/compiler/prod-builder.js", () => ({
  __esModule: true,
  buildForProduction: (...args: Parameters<typeof buildForProductionMock>) => buildForProductionMock(...args),
}))

jest.mock("../../src/server/dev-server.js", () => ({
  __esModule: true,
  DevServer: jest.fn().mockImplementation((options: Record<string, unknown>) => {
    devServerConstructorMock(options)
    return devServerInstance
  }),
}))

let devCommand: typeof import("../../src/cli/commands.js").devCommand
let buildCommand: typeof import("../../src/cli/commands.js").buildCommand
let startCommand: typeof import("../../src/cli/commands.js").startCommand

const normalize = (value: string) => value.replace(/\\/g, "/")

beforeAll(async () => {
  const mod = await import("../../src/cli/commands.js")
  devCommand = mod.devCommand
  buildCommand = mod.buildCommand
  startCommand = mod.startCommand
})

describe("CLI command handlers", () => {
  let consoleErrorSpy: jest.SpyInstance<void, Parameters<typeof console.error>>

  beforeEach(() => {
    jest.clearAllMocks()
    buildForProductionMock.mockReset()
    devServerConstructorMock.mockReset()
    devServerStartMock.mockReset()
    devServerStopMock.mockReset()
    devServerInstance = { start: devServerStartMock, stop: devServerStopMock }
    devServerStartMock.mockResolvedValue()
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe("devCommand", () => {
    it("starts the dev server and wires SIGINT handling", async () => {
      const exitMock = jest.fn()
      const sigintHandlers: Array<() => void> = []
      const onSigintMock = jest.fn((handler: () => void) => {
        sigintHandlers.push(handler)
      })

      const options = { basePath: "/app", port: 4000, strict: true, fullStackTrace: true }
      const server = await devCommand(options, { exit: exitMock as never, onSigint: onSigintMock })

      expect(devServerConstructorMock).toHaveBeenCalledWith({
        basePath: "/app",
        port: 4000,
        noStrict: false,
        fullStackTrace: true,
      })
      expect(devServerStartMock).toHaveBeenCalled()
      expect(onSigintMock).toHaveBeenCalledTimes(1)
      expect(server).toBe(devServerInstance)

      sigintHandlers[0]()

      expect(devServerStopMock).toHaveBeenCalledWith("SIGINT")
      expect(exitMock).toHaveBeenCalledWith()
    })
  })

  describe("buildCommand", () => {
    it("exits successfully after building for production", async () => {
      buildForProductionMock.mockResolvedValueOnce()
      const exitMock = jest.fn()

      await buildCommand(
        {
          basePath: "/workspace",
          output: "/workspace/dist",
          minify: false,
          analyze: true,
          serverlessFrontend: true,
          noAssetRewrite: true,
          reactCompiler: false,
        },
        { exit: exitMock as never }
      )

      expect(buildForProductionMock).toHaveBeenCalledWith(
        "/workspace",
        "/workspace/dist",
        false,
        true,
        true,
        true,
        false
      )
      expect(exitMock).toHaveBeenCalledWith(0)
    })

    it("logs and exits with 1 when the build throws", async () => {
      const error = new Error("boom")
      buildForProductionMock.mockRejectedValueOnce(error)
      const exitMock = jest.fn()
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {})

      await buildCommand(
        {
          basePath: "/workspace",
          output: "/workspace/dist",
          minify: true,
          analyze: false,
          serverlessFrontend: false,
          noAssetRewrite: false,
          reactCompiler: true,
        },
        { exit: exitMock as never }
      )

      expect(logSpy).toHaveBeenCalledWith("Build error:", error)
      expect(exitMock).toHaveBeenCalledWith(1)

      logSpy.mockRestore()
    })
  })

  describe("startCommand", () => {
    const createChildProcessMock = () => {
      const stdout = { pipe: jest.fn() }
      const stderr = { pipe: jest.fn() }
      const on = jest.fn()
      const kill = jest.fn()
      return { stdout, stderr, on, kill }
    }

    it("prefers the dist/main.cjs entry when available", async () => {
      const distMain = normalize(path.join("/app", "dist", "main.cjs"))
      const rootMain = normalize(path.join("/app", "main.cjs"))
      const existsSyncMock = jest.fn<boolean, [string]>()
      const fileSystem = { existsSync: (targetPath: string) => existsSyncMock(targetPath) } as unknown as FileSystem
      existsSyncMock.mockImplementation((targetPath) => {
        const normalized = normalize(targetPath)
        if (normalized === distMain) return true
        if (normalized === rootMain) return false
        return false
      })
      const child = createChildProcessMock()
      const spawnMock = jest.fn().mockReturnValue(child)
      const exitMock = jest.fn()
      const sigintHandlers: Array<() => void> = []
      const onSigintMock = jest.fn((handler: () => void) => {
        sigintHandlers.push(handler)
      })

      await startCommand(
        { basePath: "/app", port: 4500 },
        { spawn: spawnMock, exit: exitMock as never, onSigint: onSigintMock, fileSystem }
      )

      expect(spawnMock).toHaveBeenCalledWith("node", ["./main.cjs", "--port", "4500"], { cwd: path.join("/app", "dist") })
      expect(child.stdout.pipe).toHaveBeenCalledWith(process.stdout)
      expect(child.stderr.pipe).toHaveBeenCalledWith(process.stderr)

      const closeHandler = child.on.mock.calls.find(([event]) => event === "close")?.[1] as (code?: number) => void
      expect(closeHandler).toBeInstanceOf(Function)
      closeHandler(2)
      expect(exitMock).toHaveBeenCalledWith(2)

      sigintHandlers[0]()
      expect(child.kill).toHaveBeenCalledWith("SIGINT")
      expect(exitMock).toHaveBeenCalledWith(0)
    })

    it("falls back to the project root main.cjs when dist is missing", async () => {
      const distMain = normalize(path.join("/srv", "dist", "main.cjs"))
      const rootMain = normalize(path.join("/srv", "main.cjs"))
      const existsSyncMock = jest.fn<boolean, [string]>()
      const fileSystem = { existsSync: (targetPath: string) => existsSyncMock(targetPath) } as unknown as FileSystem
      existsSyncMock.mockImplementation((targetPath) => {
        const normalized = normalize(targetPath)
        if (normalized === distMain) return false
        if (normalized === rootMain) return true
        return false
      })
      const child = createChildProcessMock()
      const spawnMock = jest.fn().mockReturnValue(child)
      const exitMock = jest.fn()
      const onSigintMock = jest.fn()

      await startCommand(
        { basePath: "/srv", port: 3001 },
        { spawn: spawnMock, exit: exitMock as never, onSigint: onSigintMock, fileSystem }
      )

      expect(spawnMock).toHaveBeenCalledWith("node", ["./main.cjs", "--port", "3001"], { cwd: "/srv" })
    })

    it("prints an error and exits when no compiled entry exists", async () => {
      const existsSyncMock = jest.fn<boolean, [string]>().mockReturnValue(false)
      const fileSystem = { existsSync: (targetPath: string) => existsSyncMock(targetPath) } as unknown as FileSystem
      const spawnMock = jest.fn()
      const exitMock = jest.fn()

      await startCommand(
        { basePath: "/missing", port: 3030 },
        { spawn: spawnMock, exit: exitMock as never, onSigint: jest.fn(), fileSystem }
      )

      expect(spawnMock).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `No main.cjs found in /missing or ${path.join("/missing", "dist")}. Please run "peaque build" first.`
      )
      expect(exitMock).toHaveBeenCalledWith(1)
    })
  })
})
