import { buildRouter, RouteFileConfig } from "../../src/router/builder.js"
import { MockFileSystem } from "../../src/filesystem/index.js"
import { match } from "../../src/router/router.js"
import { describe, test, expect } from '@jest/globals'

describe('Router Builder', () => {
  test('should build router with mock filesystem', () => {
    const mockFs = new MockFileSystem()

    // Set up a mock directory structure
    mockFs.writeFileSync("/app/pages/page.tsx", "")
    mockFs.mkdirSync("/app/pages/users", { recursive: true })
    mockFs.writeFileSync("/app/pages/users/page.tsx", "")
    mockFs.mkdirSync("/app/pages/users/[id]", { recursive: true })
    mockFs.writeFileSync("/app/pages/users/[id]/page.tsx", "")

    const config: RouteFileConfig[] = [
      { pattern: "page.tsx", property: "page", stacks: false, accept: true }
    ]

    const router = buildRouter("/app/pages", config, mockFs)

    // Test the router
    const homeMatch = match("/", router)
    expect(homeMatch?.pattern).toBe("/")

    const usersMatch = match("/users", router)
    expect(usersMatch?.pattern).toBe("/users")

    const userMatch = match("/users/123", router)
    expect(userMatch?.pattern).toBe("/users/:id")
    expect(userMatch?.params).toEqual({ id: "123" })
  })
})