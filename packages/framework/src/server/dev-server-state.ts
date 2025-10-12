import path from "path"
import { buildRouterIfExists, componentifyRouter, pageRouterConfig, apiRouterConfig, resolveSpecialPages, ComponentImport, SpecialPageReferences } from "../router/route-files.js"
import type { RouteNode } from "../router/router.js"
import { type FileSystem, realFileSystem } from "../filesystem/index.js"

export interface FrontendState {
  router: RouteNode<string>
  imports: ComponentImport[]
  specialPages: SpecialPageReferences
}

export function loadFrontendState(basePath: string, fileSystem: FileSystem = realFileSystem): FrontendState {
  const pagesDir = path.join(basePath, "src/pages")
  const router = buildRouterIfExists(basePath, "src/pages", pageRouterConfig, fileSystem)
  const imports = componentifyRouter(router, pagesDir)
  const specialPages = resolveSpecialPages(basePath, fileSystem)
  return { router, imports, specialPages }
}

export function loadBackendRouter(basePath: string, fileSystem: FileSystem = realFileSystem): RouteNode<string> {
  return buildRouterIfExists(basePath, "src/api", apiRouterConfig, fileSystem)
}
