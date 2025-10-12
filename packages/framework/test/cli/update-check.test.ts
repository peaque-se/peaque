import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from "@jest/globals"

const yellowMock = jest.fn((text: string) => `[yellow] ${text}`)

jest.mock("../../src/server/version.js", () => ({
  platformVersion: "1.0.0",
}))

jest.mock("yoctocolors", () => ({
  __esModule: true,
  default: {
    yellow: (text: string) => yellowMock(text),
  },
  yellow: (text: string) => yellowMock(text),
}))

let checkForUpdates: typeof import("../../src/cli/update-check.js").checkForUpdates

beforeAll(async () => {
  ;({ checkForUpdates } = await import("../../src/cli/update-check.js"))
})

const fetchMock = jest.fn<
  Promise<{ json: () => Promise<{ version: string }> }>,
  [RequestInfo | URL, RequestInit?]
>()

describe("checkForUpdates", () => {
  beforeEach(() => {
    yellowMock.mockClear()
    fetchMock.mockReset()
    globalThis.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    delete (globalThis as any).fetch
  })

  it("does nothing when the latest version matches the current platform", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ version: "1.0.0" }),
    })
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {})

    await checkForUpdates()

    expect(logSpy).not.toHaveBeenCalled()
    expect(yellowMock).not.toHaveBeenCalled()

    logSpy.mockRestore()
  })

  it("prints upgrade instructions when a newer version is available", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ version: "2.0.0" }),
    })
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {})

    await checkForUpdates()

    expect(fetchMock).toHaveBeenCalledWith("https://registry.npmjs.org/@peaque/framework/latest")
    expect(yellowMock).toHaveBeenCalledTimes(6)
    expect(yellowMock).toHaveBeenCalledWith("-----------------------------------------------------------------")
    expect(yellowMock).toHaveBeenCalledWith("   Version 2.0.0 of @peaque/framework is available")
    expect(yellowMock).toHaveBeenCalledWith("   (You have version 1.0.0 installed)")
    expect(yellowMock).toHaveBeenCalledWith("   To update to the latest version, run:")
    expect(yellowMock).toHaveBeenCalledWith("   npm install @peaque/framework@latest")
    expect(logSpy).toHaveBeenCalledTimes(10)

    logSpy.mockRestore()
  })

  it("swallows network errors quietly", async () => {
    fetchMock.mockRejectedValue(new Error("network down"))
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {})

    await expect(checkForUpdates()).resolves.toBeUndefined()

    expect(logSpy).not.toHaveBeenCalled()
    expect(yellowMock).not.toHaveBeenCalled()

    logSpy.mockRestore()
  })
})
