import path from "path"
import { RouteNode } from "./router.js"
import { buildRouter, RouteFileConfig } from "./builder.js"
import { type FileSystem, realFileSystem } from "../filesystem/index.js"

export interface ComponentImport {
  identifier: string
  importPath: string
}

export interface PageComponentReference {
  identifier: string
  importPath: string
}

export interface SpecialPageReferences {
  loading?: PageComponentReference
  missing?: PageComponentReference
  error?: PageComponentReference
  accessDenied?: PageComponentReference
}

export const pageRouterConfig: RouteFileConfig[] = [
  { pattern: "page.tsx", property: "page", stacks: false, accept: true },
  { pattern: "layout.tsx", property: "layout", stacks: true },
  { pattern: "guard.ts", property: "guards", stacks: true },
  { pattern: "head.ts", property: "heads", stacks: true },
  { pattern: "middleware.ts", property: "middleware", stacks: false },
]

export const apiRouterConfig: RouteFileConfig[] = [
  { pattern: "route.ts", property: "handler", stacks: false, accept: true },
  { pattern: "middleware.ts", property: "middleware", stacks: true },
]

export function buildRouterIfExists(
  basePath: string,
  directory: string,
  config: RouteFileConfig[],
  fileSystem: FileSystem = realFileSystem
): RouteNode<string> {
  const dirPath = path.join(basePath, directory)
  if (fileSystem.existsSync(dirPath)) {
    return buildRouter(dirPath, config, fileSystem) as RouteNode<string>
  }
  return createEmptyRouteNode()
}

export function componentifyRouter(router: RouteNode<string>, baseDir: string): ComponentImport[] {
  const imports = new Map<string, ComponentImport>()

  function trackFile(filePath: string): string {
    const relativePath = path.relative(baseDir, filePath).replace(/\\/g, "/")
    const identifier = createComponentIdentifier(relativePath)
    const importPath = "./src/pages/" + relativePath
    if (!imports.has(importPath)) {
      imports.set(importPath, { identifier, importPath })
    }
    return identifier
  }

  function traverse(node: RouteNode<string>) {
    if (node.names) {
      for (const key of Object.keys(node.names)) {
        const filePath = node.names[key]
        if (typeof filePath === "string") {
          node.names[key] = trackFile(filePath)
        }
      }
    }

    if (node.stacks) {
      for (const key of Object.keys(node.stacks)) {
        node.stacks[key] = node.stacks[key].map((filePath) => (typeof filePath === "string" ? trackFile(filePath) : filePath))
      }
    }

    for (const child of node.staticChildren.values()) {
      traverse(child)
    }
    if (node.paramChild) {
      traverse(node.paramChild)
    }
    if (node.wildcardChild) {
      traverse(node.wildcardChild)
    }
  }

  traverse(router)
  return Array.from(imports.values())
}

export function resolveSpecialPages(basePath: string, fileSystem: FileSystem = realFileSystem): SpecialPageReferences {
  const pagesDir = path.join(basePath, "src", "pages")
  if (!fileSystem.existsSync(pagesDir)) {
    return {}
  }

  const results: SpecialPageReferences = {}
  const descriptors: Array<{ file: string; prop: keyof SpecialPageReferences; defaultName: string }> = [
    { file: "loading.tsx", prop: "loading", defaultName: "Loading" },
    { file: "404.tsx", prop: "missing", defaultName: "Missing" },
    { file: "error.tsx", prop: "error", defaultName: "Error" },
    { file: "403.tsx", prop: "accessDenied", defaultName: "AccessDenied" },
  ]

  for (const descriptor of descriptors) {
    const absolute = path.join(pagesDir, descriptor.file)
    if (fileSystem.existsSync(absolute)) {
      const relativeImport = "./src/pages/" + descriptor.file.replace(/\\/g, "/")
      results[descriptor.prop] = {
        identifier: descriptor.defaultName,
        importPath: relativeImport,
      }
    }
  }

  return results
}

function createComponentIdentifier(relativePath: string): string {
  const name = relativePath
    .replace(/[^a-zA-Z0-9]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")

  return name || "Component"
}

function createEmptyRouteNode(): RouteNode<string> {
  return {
    staticChildren: new Map(),
    names: {},
    stacks: {},
    accept: false,
  }
}
