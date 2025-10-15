import path from "path"
import colors from "yoctocolors"
import { globSync } from "glob"
import { CodeFile } from "../../codegen/index.js"
import type { RouteNode } from "../../router/router.js"
import type { ServerShim } from "../../server/make-rpc.js"
import { detectExportedMethods } from "./backend-program-utils.js"
import { type FileSystem, realFileSystem } from "../../filesystem/index.js"

export function buildJobsFunction(basePath: string, file: CodeFile): void {
  const jobsDir = path.join(basePath, "src", "jobs")
  const jobFiles = globSync(`${jobsDir}/**/job.ts`)

  const body = file.body

  body.line("const jobs = []")
  body.block("function startJobs() {", startBuilder => {
    if (jobFiles.length === 0) {
      return
    }

    file.addNamedImport("croner", "Cron")

    for (const jobFile of jobFiles) {
      const relativePath = path.relative(basePath, jobFile).replace(/\\/g, "/")
      const displayName = path.relative(jobsDir, jobFile).replace(/\\/g, "/").replace("/job.ts", "")
      const alias = relativePath.replace(/[^a-zA-Z0-9]/g, "_") + "Job"

      file.addNamespaceImport(`./${relativePath}`, alias)

      startBuilder.block(`for (const schedule of ${alias}.schedule) {`, jobBuilder => {
        jobBuilder.line("const job = new Cron(schedule, { protect: true }, () => {")
        jobBuilder.indented(callbackBuilder => {
          callbackBuilder.line("try {")
          callbackBuilder.indented(tryBuilder => {
            tryBuilder.line(`${alias}.runJob()`)
          })
          callbackBuilder.line("} catch (error) {")
          callbackBuilder.indented(catchBuilder => {
            catchBuilder.line(`console.error("Error running job ${colors.red(displayName)}:", error)`)
          })
          callbackBuilder.line("}")
        })
        jobBuilder.line("})")
        jobBuilder.line("jobs.push(job)")
        jobBuilder.line(`console.log(\`     ${colors.green("✓")} Scheduling job ${colors.green(displayName)} with schedule: \${schedule}\`)`)
      })
    }
  })
}

export function generateBackendServerCode(
  apiRouter: RouteNode<string>,
  headStacks: Map<string, { headStack: string[]; html: string }>,
  pageRouter: RouteNode<string>,
  basePath: string,
  assetPath: string,
  serverShims: Array<ServerShim>,
  platformVersion: string,
  fileSystem: FileSystem = realFileSystem,
): string {
  const file = new CodeFile()

  file.addNamedImport("@peaque/framework/server", "Router")
  file.addNamedImport("@peaque/framework/server", "HttpServer")
  file.addNamedImport("@peaque/framework/server", "addAssetRoutesForFolder")
  file.addNamedImport("@peaque/framework/server", "executeMiddlewareChain")
  file.addNamedImport("@peaque/framework/server", "checkCsrfProtection")
  file.addDefaultImport("path", "path")

  for (const [stackKey, { html }] of headStacks) {
    file.body.line(`const index_${stackKey} = \`${html}\``)
  }

  const handlerImports: Array<{ alias: string; path: string; file: string; methods: string[] }> = []
  function traverseApiRoutes(node: RouteNode<string>, currentPath: string = "") {
    if (node.names?.handler) {
      const handlerFile = node.names.handler
      const relativePath = path.relative(basePath, handlerFile).replace(/\\/g, "/")
      const alias = relativePath.replace(/[^a-zA-Z0-9]/g, "_")
      const methods = detectExportedMethods(handlerFile, fileSystem)
      handlerImports.push({ alias, path: "./" + relativePath, file: handlerFile, methods })
    }

    for (const [key, child] of node.staticChildren.entries()) {
      traverseApiRoutes(child, currentPath + "/" + key)
    }
    if (node.paramChild) {
      traverseApiRoutes(node.paramChild, currentPath + "/:" + node.paramChild.paramName)
    }
    if (node.wildcardChild) {
      traverseApiRoutes(node.wildcardChild, currentPath + "/*")
    }
  }

  traverseApiRoutes(apiRouter)

  for (const { alias, path: importPath, methods } of handlerImports) {
    if (methods.length > 0) {
      for (const method of methods) {
        file.addNamedImport(importPath, method, `${alias}_${method}`)
      }
    }
  }

  let startupImport = ""
  let startupReference = ""
  let rootMiddleware = ""
  if (fileSystem.existsSync(path.join(basePath, "src", "startup.ts"))) {
    startupImport = `./src/startup.ts`
    startupReference = "// Ensure startup module is loaded for side effects"
  }
  if (fileSystem.existsSync(path.join(basePath, "src", "middleware.ts"))) {
    rootMiddleware = "./src/middleware.ts"
  }

  if (startupImport) file.addNamespaceImport(startupImport, "StartupModule")
  if (rootMiddleware) file.addNamedImport(rootMiddleware, "middleware", "AbsoluteRootMiddleware")

  const handlerMethodsMap = new Map<string, string[]>()
  for (const { file, methods } of handlerImports) {
    handlerMethodsMap.set(file, methods)
  }

  if (headStacks.size > 0) {
    file.body.blankLine()
  }
  buildJobsFunction(basePath, file)
  file.body.blankLine()

  file.body.block("export async function makeBackendRouter() {", routerBuilder => {
    routerBuilder.line("const router = new Router()")

    function generateApiRouteRegistrations(node: RouteNode<string>, currentPath: string = "") {
      if (node.names?.handler) {
        const handlerFile = node.names.handler
        const relativePath = path.relative(basePath, handlerFile).replace(/\\/g, "/")
        const alias = relativePath.replace(/[^a-zA-Z0-9]/g, "_")
        const routePath = "/api" + currentPath

        const methods = handlerMethodsMap.get(handlerFile) || []
        for (const method of methods) {
          routerBuilder.line(`router.addRoute("${method}", "${routePath}", ${alias}_${method})`)
        }
      }

      for (const [key, child] of node.staticChildren.entries()) {
        const nextPath = child.excludeFromPath ? currentPath : currentPath + "/" + key
        generateApiRouteRegistrations(child, nextPath)
      }
      if (node.paramChild) {
        generateApiRouteRegistrations(node.paramChild, currentPath + "/:" + node.paramChild.paramName)
      }
      if (node.wildcardChild) {
        generateApiRouteRegistrations(node.wildcardChild, currentPath + "/*" + node.wildcardChild.paramName)
      }
    }

    generateApiRouteRegistrations(apiRouter)

    if (serverShims.length > 0) {
      file.addDefaultImport("superjson", "superjson")
    }
    for (let i = 0; i < serverShims.length; i++) {
      const shim = serverShims[i]
      const alias = `ServerShim_${i}`
      const relativePath = path.relative(basePath, shim.path).replace(/\\/g, "/")
      file.addNamespaceImport(`./${relativePath}`, alias)
      for (const func of shim.exportedFunctions) {
        routerBuilder.line(
          `router.addRoute("POST", "/api/__rpc/${i}/${func.name}", async (req) => { if (!checkCsrfProtection(req)) { req.code(403).send({ error: "Forbidden: Cross-origin request rejected" }); return; } req.send(superjson.stringify(await ${alias}.${func.name}(...(superjson.parse(req.rawBody().toString()).args))))})`,
        )
      }
    }

    function generatePageRouteRegistrations(node: RouteNode<string>, currentPath: string = "", accumulatedHeads: string[] = []) {
      const heads = node.stacks?.heads ? [...accumulatedHeads, ...node.stacks.heads] : accumulatedHeads

      if (node.accept) {
        const routePath = currentPath || "/"
        const stackKey = heads.length > 0 ? heads.map((f) => f.replace(/[^a-zA-Z0-9]/g, "_")).join("_") : "default"
        routerBuilder.line(`router.addRoute("GET", "${routePath}", (req) => { req.type("text/html").send(index_${stackKey}) })`)
      }

      for (const [key, child] of node.staticChildren.entries()) {
        const nextPath = child.excludeFromPath ? currentPath : currentPath + "/" + key
        generatePageRouteRegistrations(child, nextPath, heads)
      }
      if (node.paramChild) {
        generatePageRouteRegistrations(node.paramChild, currentPath + "/:" + node.paramChild.paramName, heads)
      }
      if (node.wildcardChild) {
        generatePageRouteRegistrations(node.wildcardChild, currentPath + "/*" + node.wildcardChild.paramName, heads)
      }
    }

    generatePageRouteRegistrations(pageRouter)

    routerBuilder.line(`const assetFolderPath = path.join(__dirname, "${assetPath}")`)
    routerBuilder.line(`await addAssetRoutesForFolder(router, assetFolderPath, "/${assetPath}", true, true)`)
    routerBuilder.line("return router")
  })
  file.body.blankLine()

  const hasStartupModule = Boolean(startupImport)
  const hasRootMiddleware = Boolean(rootMiddleware)

  const builtAt = new Date().toISOString().replace("T", " ").replace("Z", "").substring(0, 19)

  file.body.block("async function main() {", mainBuilder => {
    if (hasStartupModule) {
      mainBuilder.line(startupReference)
      mainBuilder.line("StartupModule;")
    }
    mainBuilder.line("const args = process.argv.slice(1)")
    mainBuilder.line('const portIndex = args.findIndex(arg => arg === "-p" || arg === "--port")')
    mainBuilder.line("const port = portIndex !== -1 && args.length > portIndex + 1 ? parseInt(args[portIndex + 1], 10) : 3000")
    mainBuilder.line("const router = await makeBackendRouter()")
    if (hasRootMiddleware) {
      mainBuilder.line("const handler = async (req) => { await executeMiddlewareChain(req, [AbsoluteRootMiddleware], router.getRequestHandler()) }")
    } else {
      mainBuilder.line("const handler = router.getRequestHandler()")
    }
    mainBuilder.line("const server = new HttpServer(handler)")
    mainBuilder.line("server.startServer(port)")
    mainBuilder.line(`console.log("🌍  ${colors.bold(colors.yellow("Peaque Framework " + platformVersion))} production server")`)
    mainBuilder.line(`console.log("     ${colors.green("✓")} Server built on ${colors.gray(builtAt)}")`)
    mainBuilder.line("await startJobs()")
    mainBuilder.line(`console.log("     ${colors.green("✓")} Listening on port " + port)`)
    mainBuilder.line(`console.log("     ${colors.green("✓")} Process id " + process.pid)`)
    mainBuilder.line(`console.log("     ${colors.green("✓")} Happy browsing!")`)
    mainBuilder.block("process.on('SIGINT', () => {", signalBuilder => {
      signalBuilder.line("server.stop()")
      signalBuilder.line("process.exit(0)")
    }, { close: "})" })
    mainBuilder.block("process.on('SIGTERM', () => {", signalBuilder => {
      signalBuilder.line("server.stop()")
      signalBuilder.line("process.exit(0)")
    }, { close: "})" })
  })
  file.body.line("main()")

  return file.toString()
}
