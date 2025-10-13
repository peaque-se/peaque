import chokidar from "chokidar"
import { config } from "dotenv"
import path from "path"
import colors from "yoctocolors"
import { setupImportAliases } from "../compiler/imports.js"
import { setupSourceMaps } from "../exceptions/sourcemaps.js"
import { hmrConnectHandler, notifyConnectedClients } from "../hmr/hmr-handler.js"
import { ModuleLoader } from "../hmr/module-loader.js"
import { executeMiddlewareChain } from "../http/http-router.js"
import { HttpServer } from "../http/http-server.js"
import { PeaqueRequest, RequestHandler } from "../http/http-types.js"
import { JobsRunner } from "../jobs/jobs-runner.js"
import { FileCache } from "./file-cache.js"
import { platformVersion } from "./version.js"
import { loadBackendRouter, loadFrontendState, FrontendState } from "./dev-server-state.js"
import { createDevRouterModule } from "./dev-server-view.js"
import { handleBackendApiRequest } from "./dev-server-api.js"
import { serveSourceModule, handleRpcRequest, ModuleContext } from "./dev-server-modules.js"
import { servePeaqueCss, servePeaqueMainHtml, servePeaqueMainScript, servePeaqueLoaderScript, servePublicAsset } from "./dev-server-static.js"
import type { RouteNode } from "../router/router.js"
import { type FileSystem, realFileSystem } from "../filesystem/index.js"

export interface DevServerOptions {
  basePath: string
  port: number
  noStrict: boolean
  fullStackTrace?: boolean
  fileSystem?: FileSystem
}

/// fifteenth attempt at a dev server that reloads even better, but is still fast
export class DevServer {
  private basePath: string
  private port: number
  private noStrict: boolean
  private server: HttpServer
  private frontendState: FrontendState
  private backendRouter: RouteNode<string>
  private moduleCache: FileCache<any> = new FileCache()
  private moduleLoader: ModuleLoader
  private jobsRunner: JobsRunner
  private watcher: chokidar.FSWatcher | undefined
  private handler: RequestHandler = this.requestHandler.bind(this)
  private readonly fileSystem: FileSystem

  constructor({ basePath, port, noStrict, fullStackTrace = false, fileSystem = realFileSystem }: DevServerOptions) {
    this.basePath = basePath
    this.port = port
    this.noStrict = noStrict
    this.server = new HttpServer((r) => this.handler(r))
    this.fileSystem = fileSystem
    this.moduleLoader = new ModuleLoader({ absWorkingDir: basePath, fileSystem: this.fileSystem })
    this.jobsRunner = new JobsRunner(basePath, this.fileSystem)

    this.frontendState = loadFrontendState(this.basePath, this.fileSystem)
    this.backendRouter = loadBackendRouter(this.basePath, this.fileSystem)

    const tsconfigPath = path.join(basePath, "tsconfig.json")
    if (this.fileSystem.existsSync(tsconfigPath)) {
      const tsconfigContent = this.fileSystem.readFileSync(tsconfigPath, "utf-8") as string
      try {
        const tsconfigJson = JSON.parse(tsconfigContent)
        setupImportAliases(tsconfigJson)
      } catch (err) {
        console.error(`Error parsing ${tsconfigPath}:`, err)
      }
    }

    // setBaseDependencies(basePath, this.fileSystem)

    if (!fullStackTrace) {
      setupSourceMaps()
    }

    if (this.fileSystem.existsSync(path.join(basePath, "src/middleware.ts"))) {
      this.moduleLoader
        .loadExport(path.relative(basePath, path.join(basePath, "src/middleware.ts")).replace(/\\/g, "/"), "middleware")
        .then((mw) => {
          console.log(`     ${colors.green("✓")} Loaded global middleware from src/middleware.ts`)
          this.handler = (req) => executeMiddlewareChain(req, [mw], this.requestHandler.bind(this))
        })
        .catch((err) => {
          console.error("Error loading global middleware:", err)
        })
    }

    config({ path: path.join(basePath, ".env"), override: true }) // re-load .env variables on each rebuild
    config({ path: path.join(basePath, ".env.local"), override: true }) // re-load .env variables on each rebuild
  }

  async start() {
    try {
      await this.runStartup()
      this.jobsRunner.startOrUpdateJobs()
      this.watchSourceFiles()
      await this.server.startServer(this.port)
      // change window title to Peaque Framework - port
      process.stdout.write(`\x1b]0;🌍 Peaque Framework ${platformVersion}\x07`)
      console.log(`🌍  ${colors.bold(colors.yellow("Peaque Framework " + platformVersion))} server running`)
      console.log(`     ${colors.green("✓")} Local ${colors.underline(`http://localhost:${this.port}`)}`)
      console.log(`     ${colors.green("✓")} Base path ${colors.gray(`${this.basePath}`)}`)
      if (this.noStrict) {
        console.log(`     ${colors.yellow("✗")} React Strict Mode is ${colors.bold("disabled")}`)
      }
      console.log(`     ${colors.green("✓")} Have fun coding!`)
    } catch (error: any) {
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${this.port} is already in use. Please choose a different port or stop the process using it.`)
      } else {
        console.error(`❌ Failed to start server.`)
        console.error(error)
      }
      process.exit(1)
    }
  }
  private async runStartup() {
    const startupFile = path.join(this.basePath, "src", "startup.ts")
    if (this.fileSystem.existsSync(startupFile)) {
      await this.moduleLoader.loadModule(path.relative(this.basePath, startupFile).replace(/\\/g, "/"))
      console.log(`     ${colors.green("✓")} Executed startup script from src/startup.ts`)
    }
  }

  async stop(reason?: string) {
    this.server.stop()
    this.jobsRunner.stop()
    this.watcher?.close()
    console.log(`     ${colors.green("✓")} Peaque Framework ${platformVersion} server ${colors.red("stopped")} ${reason ? `(${colors.gray(reason)})` : ""}`)
    console.log(`     ${colors.green("✓")} Good bye! See you later!`)
  }

  private async requestHandler(req: PeaqueRequest) {
    await handleDevServerRequest(req, {
      basePath: this.basePath,
      port: this.port,
      noStrict: this.noStrict,
      frontendState: this.frontendState,
      backendRouter: this.backendRouter,
      moduleContext: this.moduleContext(),
      fileSystem: this.fileSystem,
    })
  }

  private watchSourceFiles() {
    const srcDir = this.basePath + "/src"
    // Only watch if src directory exists
    if (!this.fileSystem.existsSync(srcDir)) {
      return
    }
    // watch the src directory recursively for changes to .ts, .tsx, .js, .jsx files with chokidar
    this.watcher = chokidar.watch(srcDir, {
      cwd: this.basePath,
      ignored: ["dist/**", "build/**", "node_modules/**", ".peaque/**", ".git/**", ".*/**"],
      ignoreInitial: true,
      persistent: true,
    })

    this.watcher.on("all", (event, changedPath) => {
      if (changedPath.endsWith(".tsx")) {
        notifyConnectedClients({ event, path: changedPath.replace(".tsx", "") }, changedPath)
        return
      }

      if (changedPath.startsWith("src/pages/")) {
        this.frontendState = loadFrontendState(this.basePath, this.fileSystem)
        notifyConnectedClients({ event, path: "/peaque.js" }, "<main router>")
        return
      }

      if (changedPath.startsWith("src/api/")) {
        this.backendRouter = loadBackendRouter(this.basePath, this.fileSystem)
        return
      }

      if (changedPath.startsWith("src/jobs/")) {
        this.jobsRunner.startOrUpdateJobs()
      }
    })
  }



  public moduleContext(): ModuleContext {
    return {
      basePath: this.basePath,
      moduleLoader: this.moduleLoader,
      moduleCache: this.moduleCache,
      fileSystem: this.fileSystem,
    }
  }
}

export interface DevServerRequestContext {
  basePath: string
  port: number
  noStrict: boolean
  frontendState: FrontendState
  backendRouter: RouteNode<string>
  moduleContext: ModuleContext
  fileSystem: FileSystem
}

export async function handleDevServerRequest(req: PeaqueRequest, context: DevServerRequestContext): Promise<void> {
  const requestPath = req.path()

  if (requestPath.startsWith("/@deps/")) {
    const { bundleModuleFromNodeModules } = await import("../compiler/bundle.js")
    const path = req.path()
    const module = path.replace("/@deps/", "")
    const contents = await bundleModuleFromNodeModules(module, context.basePath, context.fileSystem)
    req.code(200).header("Content-Type", "application/javascript").send(contents)
    return
  }

  if (requestPath.startsWith("/@src/")) {
    await serveSourceModule(req, context.moduleContext)
    return
  }

  if (requestPath.startsWith("/api/__rpc/")) {
    await handleRpcRequest(req, context.moduleContext)
    return
  }

  if (requestPath.startsWith("/api/")) {
    await handleBackendApiRequest(req, {
      backendRouter: context.backendRouter,
      basePath: context.basePath,
      moduleCache: context.moduleContext.moduleCache,
      moduleLoader: context.moduleContext.moduleLoader,
    })
    return
  }

  if (requestPath === "/peaque-dev.js") {
    servePeaqueMainScript(req, context.port)
    return
  }

  if (requestPath === "/peaque-loader.js") {
    servePeaqueLoaderScript(req)
    return
  }

  if (requestPath === "/peaque.js") {
    const js = createDevRouterModule(context.frontendState, !context.noStrict)
    req.type("application/javascript").send(js)
    return
  }

  if (requestPath === "/peaque.css") {
    await servePeaqueCss(req, context.basePath, context.fileSystem)
    return
  }

  if (requestPath === "/hmr") {
    await hmrConnectHandler(req)
    return
  }

  if (servePublicAsset(req, context.basePath, requestPath, context.fileSystem)) {
    return
  }

  servePeaqueMainHtml(req)
}
