import fs from "fs"
import os from "os"
import path from "path"
import { apiRouterConfig, buildRouterIfExists, componentifyRouter, pageRouterConfig, resolveSpecialPages } from "../../src/router/route-files.js"
import type { RouteNode } from "../../src/router/router.js"

const createRouteNode = (): RouteNode<string> => ({
  staticChildren: new Map(),
  names: {},
  stacks: {},
  accept: false,
})

describe("route-files helpers", () => {
  it("componentifyRouter converts file references into component imports", () => {
    const pagesDir = path.join(process.cwd(), "fixtures", "src", "pages")
    const router: RouteNode<string> = {
      staticChildren: new Map(),
      names: {
        page: path.join(pagesDir, "home/index.tsx"),
      },
      stacks: {
        middleware: [path.join(pagesDir, "middleware.ts")],
      },
      accept: true,
    }

    const imports = componentifyRouter(router, pagesDir)

    expect(router.names.page).toBe("HomeIndexTsx")
    expect(router.stacks.middleware).toEqual(["MiddlewareTs"])
    expect(imports).toContainEqual({
      identifier: "HomeIndexTsx",
      importPath: "./src/pages/home/index.tsx",
    })
    expect(imports).toContainEqual({
      identifier: "MiddlewareTs",
      importPath: "./src/pages/middleware.ts",
    })
  })

  it("componentifyRouter de-duplicates imports referring to the same file", () => {
    const pagesDir = path.join(process.cwd(), "fixtures", "src", "pages")
    const child = createRouteNode()
    child.names.page = path.join(pagesDir, "about.tsx")
    const router: RouteNode<string> = {
      staticChildren: new Map([["about", child]]),
      names: {
        page: path.join(pagesDir, "about.tsx"),
      },
      stacks: { middleware: [path.join(pagesDir, "about.tsx")] },
      accept: true,
    }

    const imports = componentifyRouter(router, pagesDir)
    const aboutImports = imports.filter((item) => item.importPath.endsWith("about.tsx"))
    expect(aboutImports).toHaveLength(1)
  })

  it("resolveSpecialPages reports available special page components", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "peaque-special-pages-"))
    const pagesDir = path.join(tmpDir, "src", "pages")
    fs.mkdirSync(pagesDir, { recursive: true })
    fs.writeFileSync(path.join(pagesDir, "404.tsx"), "export default function Missing() {}")
    fs.writeFileSync(path.join(pagesDir, "loading.tsx"), "export default function Loading() {}")

    const special = resolveSpecialPages(tmpDir)

    expect(special.missing).toEqual({
      identifier: "Missing",
      importPath: "./src/pages/404.tsx",
    })
    expect(special.loading).toEqual({
      identifier: "Loading",
      importPath: "./src/pages/loading.tsx",
    })
    expect(special.error).toBeUndefined()

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it("buildRouterIfExists returns empty router when directory is missing", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "peaque-router-"))
    const router = buildRouterIfExists(tmpDir, "nope", pageRouterConfig)
    expect(router.accept).toBe(false)
    expect(router.staticChildren.size).toBe(0)
    const apiRouter = buildRouterIfExists(tmpDir, "missing", apiRouterConfig)
    expect(apiRouter.accept).toBe(false)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
