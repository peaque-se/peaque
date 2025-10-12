import path from "path"
import { fastRefreshify } from "../compiler/fast-refreshify.js"
import { makeImportsRelative } from "../compiler/imports.js"
import { makeRpcShim } from "./make-rpc.js"
import type { PeaqueRequest } from "../http/http-types.js"
import type { ModuleLoader } from "../hmr/module-loader.js"
import { FileCache } from "./file-cache.js"
import * as superjson from "superjson"
import { type FileSystem, realFileSystem } from "../filesystem/index.js"

export interface ModuleContext {
  basePath: string
  moduleLoader: ModuleLoader
  moduleCache: FileCache<any>
  fileSystem?: FileSystem
}

export async function serveSourceModule(req: PeaqueRequest, context: ModuleContext): Promise<void> {
  const fileSystem = context.fileSystem ?? realFileSystem
  const srcPath = path.normalize(req.path().substring(5)) // remove /@src/
  const extensions = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"]
  const resolvedBasePath = path.resolve(context.basePath)

  const fullPath = extensions
    .map((ext) => path.join(context.basePath, srcPath + ext))
    .map((candidate) => path.resolve(candidate))
    .find((candidate) => {
      if (!candidate.startsWith(resolvedBasePath + path.sep) && candidate !== resolvedBasePath) {
        return false
      }
      return fileSystem.existsSync(candidate) && fileSystem.statSync(candidate).isFile()
    })

  if (!fullPath) {
    console.error(`File not found: ${srcPath} (tried with extensions: ${extensions.join(", ")})`)
    req.code(404).send("File not found")
    return
  }

  try {
    const fileContents = fileSystem.readFileSync(fullPath, "utf-8") as string
    if (fileContents.startsWith("'use server'") || fileContents.startsWith('"use server"')) {
      const relative = fullPath.substring(context.basePath.length + 1).replace(/\\/g, "/")
      const { shim } = await makeRpcShim(fileContents, relative)
      const processed = makeImportsRelative(shim, relative)
      req.type("application/javascript").send(processed)
      return
    }
    const refreshified = fastRefreshify(fileContents, srcPath)
    const processed = makeImportsRelative(refreshified, fullPath.substring(context.basePath.length + 1))
    req.type("application/javascript").send(processed)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const errorContents = `console.error("Error loading module ${srcPath}:", ${JSON.stringify(message)})\n`
      + `throw new Error(${JSON.stringify(message)})\n`
      + "export default function() {}\n"
    req.type("application/javascript").send(errorContents)
  }
}

export async function handleRpcRequest(req: PeaqueRequest, context: ModuleContext): Promise<void> {
  const rpcPath = req.path().substring(11) // remove /api/__rpc/
  const delimiter = rpcPath.lastIndexOf("/")
  const moduleName = rpcPath.substring(0, delimiter)
  const functionName = rpcPath.substring(delimiter + 1)
  const modulePath = path.join(context.basePath, moduleName).replace(/\\/g, "/")
  const module = await context.moduleCache.cacheByHash(modulePath, async () => {
    return await context.moduleLoader.loadModule(moduleName)
  })

  const target = module[functionName]
  if (typeof target !== "function") {
    req.code(404).send("RPC handler not found")
    return
  }

  const { args } = superjson.parse(req.rawBody()?.toString() ?? "{}") as { args: unknown[] }
  const result = await target(...args)
  req.type("application/json").send(superjson.stringify(result))
}
