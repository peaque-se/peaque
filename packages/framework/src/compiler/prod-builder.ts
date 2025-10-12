import { createHash } from "crypto"
import path from "path"
import colors from "yoctocolors"
import { rewritePublicAssetReferences } from "../assets/asset-rewriter.js"
import { precompressAssets } from "../assets/precompress-assets.js"
import { HeadDefinition, renderHead } from "../client/head.js"
import { buildRouter } from "../router/builder.js"
import { apiRouterConfig, componentifyRouter, pageRouterConfig, resolveSpecialPages } from "../router/route-files.js"
import { RouteNode } from "../router/router.js"
import { serializeRouterToJs } from "../router/serializer.js"
import { platformVersion } from "../server/version.js"
import { bundleBackendProgram } from "./backend-bundler.js"
import { FrontendBundler } from "./frontend-bundler.js"
import type { FrontendBuildResult } from "./frontend-bundler.js"
import { buildFrontendEntryModule } from "./frontend-entry.js"
import { generateBackendServerCode } from "./prod/backend-program.js"
import { reportBundleAnalysis } from "./prod/bundle-report.js"
import { extractHeadStacks } from "./prod/head-stacks.js"
import { writeServerlessIndexHtml } from "./prod/serverless-frontend.js"
import { bundleCssFile } from "./tailwind-bundler.js"
import { CodeBuilder } from "../codegen/index.js"
import { type FileSystem, realFileSystem } from "../filesystem/index.js"

interface AssetInfo {
  buildHash: string
  assetDir: string
  assetPath: string
}

interface FrontendArtifacts {
  router: RouteNode<string>
  entrySource: string
}

export const buildForProduction = async (
  basePath: string,
  distFolder: string,
  minify: boolean,
  analyze: boolean = false,
  noAssetRewrite: boolean = false,
  serverlessFrontend: boolean = false,
  reactCompiler: boolean = true,
  fileSystem: FileSystem = realFileSystem,
) => {
  const startTime = Date.now()
  logBuildIntro(basePath, distFolder, noAssetRewrite, reactCompiler)

  const publicFolder = path.join(basePath, "src/public")
  const frontendArtifacts = buildFrontendArtifacts(basePath, fileSystem)
  const assetInfo = prepareAssetOutput(frontendArtifacts.entrySource, distFolder, fileSystem)

  const bundleResult = await bundleFrontend(frontendArtifacts.entrySource, {
    baseDir: basePath,
    assetDir: assetInfo.assetDir,
    reactCompiler,
  })
  assertSuccessfulBundle(bundleResult)

  await writeFrontendBundle(bundleResult, {
    assetDir: assetInfo.assetDir,
    assetPath: assetInfo.assetPath,
    publicFolder,
    noAssetRewrite,
  }, fileSystem)

  if (analyze) {
    reportBundleAnalysis(bundleResult, basePath)
  }

  await bundleCssAssets({
    basePath,
    assetDir: assetInfo.assetDir,
    assetPath: assetInfo.assetPath,
    publicFolder,
    noAssetRewrite,
  }, fileSystem)

  await copyPublicAssets(publicFolder, assetInfo.assetDir, fileSystem)
  await precompressAssets(assetInfo.assetDir, fileSystem)

  const headStacks = await extractHeadStacks(
    frontendArtifacts.router,
    basePath,
    path.join(basePath, "src/pages"),
    assetInfo.assetPath,
    fileSystem,
  )

  const backendRouter = buildBackendRouter(basePath, fileSystem)
  await buildBackendPrograms({
    basePath,
    assetPath: assetInfo.assetPath,
    frontendRouter: frontendArtifacts.router,
    backendRouter,
    headStacks,
    serverShims: bundleResult.serverShims ?? [],
    outDir: distFolder,
    intermediateDir: basePath,
    minify,
    fileSystem,
  })

  if (serverlessFrontend) {
    const renderedHead = renderHead(createDefaultHead(assetInfo.assetPath), `/${assetInfo.assetPath}`)
    writeServerlessIndexHtml({ outDir: distFolder, assetPath: assetInfo.assetPath, renderedHead }, fileSystem)
  }

  await copyPrismaArtifacts(basePath, distFolder, fileSystem)
  logBuildSummary(startTime, assetInfo.assetDir, fileSystem)
}

function logBuildIntro(basePath: string, distFolder: string, noAssetRewrite: boolean, reactCompiler: boolean): void {
  console.log(`📦  ${colors.bold(colors.yellow("Peaque Framework " + platformVersion))} building for production`)
  console.log(`     ${colors.green("✓")} Base path ${colors.gray(`${basePath}`)}`)
  console.log(`     ${colors.green("✓")} Output path ${colors.gray(`${distFolder}`)}`)
  if (noAssetRewrite) {
    console.log(`     ${colors.yellow("✗")} Asset rewriting ${colors.yellow("disabled")}`)
  }
  if (!reactCompiler) {
    console.log(`     ${colors.yellow("✗")} React Compiler ${colors.yellow("disabled")}`)
  }
}

function buildFrontendArtifacts(basePath: string, fileSystem: FileSystem): FrontendArtifacts {
  const pagesDir = path.join(basePath, "src/pages")
  const router = buildRouter(pagesDir, pageRouterConfig, fileSystem) as RouteNode<string>
  const componentImports = componentifyRouter(router, pagesDir)
  const specialPages = resolveSpecialPages(basePath, fileSystem)

  const entrySource = buildFrontendEntryModule({
    headerComment: "Peaque Production Builder",
    routerSource: serializeRouterToJs(router, true),
    componentImports,
    specialPages,
    strictMode: true,
    renderMode: "bootstrap",
    routerModule: "@peaque/framework",
  })

  return { router, entrySource }
}

function prepareAssetOutput(entrySource: string, distFolder: string, fileSystem: FileSystem): AssetInfo {
  const buildHash = createHash("sha1").update(entrySource).digest("hex").substring(0, 8)
  const assetPath = `assets-${buildHash}`
  const assetDir = path.join(distFolder, assetPath)
  fileSystem.mkdirSync(assetDir, { recursive: true })
  console.log(`     ${colors.green("✓")} Build hash ${colors.gray(buildHash)}`)
  return { buildHash, assetPath, assetDir }
}

async function bundleFrontend(
  entrySource: string,
  options: { baseDir: string; assetDir: string; reactCompiler: boolean },
): Promise<FrontendBuildResult> {
  const bundler = new FrontendBundler({
    entryContent: entrySource,
    baseDir: options.baseDir,
    sourcemap: false,
    writeToFile: false,
    outputFile: path.join(options.assetDir, "peaque.js"),
    reactCompiler: options.reactCompiler,
    isDevelopment: false,
  })
  return bundler.build()
}

function assertSuccessfulBundle(result: FrontendBuildResult): void {
  if (result.errors && result.errors.length > 0) {
    console.error("Errors during JS bundling:", result.errors)
    process.exit(1)
  }
}

async function writeFrontendBundle(
  result: FrontendBuildResult,
  options: { assetDir: string; assetPath: string; publicFolder: string; noAssetRewrite: boolean },
  fileSystem: FileSystem,
): Promise<void> {
  let jsContent = result.bundleContent || ""
  if (!options.noAssetRewrite) {
    jsContent = await rewritePublicAssetReferences(jsContent, options.publicFolder, options.assetPath, fileSystem)
  }

  fileSystem.writeFileSync(path.join(options.assetDir, "peaque.js"), jsContent)
  if (result.warnings && result.warnings.length > 0) {
    console.warn("Warnings during JS bundling:", result.warnings)
  }
}

async function bundleCssAssets(
  options: {
    basePath: string
    assetDir: string
    assetPath: string
    publicFolder: string
    noAssetRewrite: boolean
  },
  fileSystem: FileSystem,
): Promise<void> {
  const stylePath = path.join(options.basePath, "src/styles.css")
  const cssContent = fileSystem.readFileSync(stylePath, "utf-8") as string
  const bundledCss = await bundleCssFile(cssContent, options.basePath)
  const finalCss = options.noAssetRewrite
    ? bundledCss
    : await rewritePublicAssetReferences(bundledCss, options.publicFolder, options.assetPath, fileSystem)

  fileSystem.writeFileSync(path.join(options.assetDir, "peaque.css"), finalCss)
}

async function copyPublicAssets(publicFolder: string, assetDir: string, fileSystem: FileSystem): Promise<void> {
  if (fileSystem.existsSync(publicFolder)) {
    await fileSystem.copy(publicFolder, assetDir, { recursive: true })
  }
}

async function buildBackendPrograms(options: {
  basePath: string
  assetPath: string
  frontendRouter: RouteNode<string>
  backendRouter: RouteNode<string>
  headStacks: Map<string, { headStack: string[]; html: string }>
  serverShims: Array<{ path: string; shim: string; exportedFunctions: Array<{ name: string }> }>
  outDir: string
  intermediateDir: string
  minify: boolean
  fileSystem: FileSystem
}): Promise<void> {
  const backendCode = generateBackendServerCode(
    options.backendRouter,
    options.headStacks,
    options.frontendRouter,
    options.basePath,
    options.assetPath,
    options.serverShims,
    platformVersion,
    options.fileSystem,
  )

  await bundleBackendProgram({
    baseDir: options.intermediateDir,
    outfile: path.join(options.outDir, "server_without_env.cjs"),
    inputContent: backendCode,
    minify: options.minify,
    sourcemap: false,
  })

  const mainJs = buildMainEntrypoint(options.intermediateDir, options.outDir)
  await bundleBackendProgram({
    baseDir: options.intermediateDir,
    outfile: path.join(options.outDir, "main.cjs"),
    inputContent: mainJs,
    minify: options.minify,
    sourcemap: false,
  })

  options.fileSystem.unlinkSync(path.join(options.outDir, "server_without_env.cjs"))
}

function buildMainEntrypoint(intermediateDir: string, outDir: string): string {
  let relativeOutDir = path.relative(intermediateDir, outDir).replace(/\\/g, "/")
  if (!relativeOutDir.startsWith(".") && !relativeOutDir.startsWith("/")) {
    relativeOutDir = "./" + relativeOutDir
  }

  const builder = new CodeBuilder()
  builder.line('import dotenv from "dotenv"')
  builder.line("const currentPath = process.cwd()")
  builder.line('dotenv.config({ path: `${currentPath}/.env`, override: true })')
  builder.line("dotenv.config()")
  builder.line(`require("${relativeOutDir === "" ? "." : relativeOutDir}/server_without_env.cjs")`)
  return builder.toString()
}

function buildBackendRouter(basePath: string, fileSystem: FileSystem): RouteNode<string> {
  const apiFolder = path.join(basePath, "src/api")
  if (!fileSystem.existsSync(apiFolder)) {
    return { staticChildren: new Map(), accept: false, names: {}, stacks: {} } as RouteNode<string>
  }
  return buildRouter(apiFolder, apiRouterConfig, fileSystem) as RouteNode<string>
}

function createDefaultHead(assetPath: string): HeadDefinition {
  return {
    title: "Peaque Framework Application",
    meta: [
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "description", content: "A Peaque Framework Application" },
    ],
    link: [{ rel: "stylesheet", href: `/${assetPath}/peaque.css` }],
  }
}

async function copyPrismaArtifacts(basePath: string, outDir: string, fileSystem: FileSystem): Promise<void> {
  try {
    const prismaDir = path.join(basePath, "node_modules", ".prisma")
    if (fileSystem.existsSync(prismaDir)) {
      const targetPrismaDir = path.join(outDir, "node_modules", ".prisma")
      fileSystem.mkdirSync(path.join(outDir, "node_modules"), { recursive: true })
      await fileSystem.copy(prismaDir, targetPrismaDir, { recursive: true })
      console.log(
        `     ${colors.green("✓")} [prisma-plugin] Copied Prisma client files to ${colors.gray(targetPrismaDir)}`,
      )
    }
  } catch (error) {
    console.error("Error checking for Prisma:", error)
  }
}

function logBuildSummary(startTime: number, assetDir: string, fileSystem: FileSystem): void {
  const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(
    `     ${colors.green("✓")} Production build completed ${colors.bold(colors.green("successfully"))} in ${elapsedSeconds} seconds`,
  )
  logFinalAssetSizes(assetDir, ["peaque.js", "peaque.css"], fileSystem)
}

function logFinalAssetSizes(assetDir: string, files: string[], fileSystem: FileSystem): void {
  for (const file of files) {
    const filePath = path.join(assetDir, file)
    const stats = fileSystem.statSync(filePath)
    console.log(
      `     ${colors.green("✓")} Final ${colors.gray(file)} size: ${colors.gray((stats.size / 1024).toFixed(2))} KB`,
    )
  }
}
