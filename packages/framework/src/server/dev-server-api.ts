import path from "path"
import { executeMiddlewareChain } from "../http/http-router.js"
import type { PeaqueRequest } from "../http/http-types.js"
import type { ModuleLoader } from "../hmr/module-loader.js"
import { match, RouteNode } from "../router/router.js"
import { FileCache } from "./file-cache.js"

export interface ApiContext {
  backendRouter: RouteNode<string>
  basePath: string
  moduleCache: FileCache<any>
  moduleLoader: ModuleLoader
}

export async function handleBackendApiRequest(req: PeaqueRequest, context: ApiContext): Promise<void> {
  const matchResult = match(req.path().substring(4), context.backendRouter) // remove /api
  if (!matchResult) {
    req.code(404).send("Not Found")
    return
  }

  matchResult.params && Object.entries(matchResult.params).forEach(([key, value]) => req.setPathParam(key, value))

  const middlewares = matchResult.stacks.middleware
    ? await Promise.all(
        matchResult.stacks.middleware.map(async (middlewareFile) =>
          await context.moduleCache.cacheByHash(middlewareFile, async () => {
            const module = path.relative(context.basePath, middlewareFile).replace(/\\/g, "/")
            return await context.moduleLoader.loadExport(module, "middleware")
          }),
        ),
      )
    : []

  const moduleFile = matchResult.names.handler
  const apiModule = await context.moduleCache.cacheByHash(moduleFile, async () => {
    const module = path.relative(context.basePath, moduleFile).replace(/\\/g, "/")
    return await context.moduleLoader.loadModule(module)
  })

  const handler = apiModule[req.method().toUpperCase()]
  if (typeof handler !== "function") {
    req.code(500).send("No handler for this method")
    return
  }

  await executeMiddlewareChain(req, middlewares, handler)
}
