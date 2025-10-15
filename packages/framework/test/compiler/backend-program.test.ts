import fs from "fs"
import os from "os"
import path from "path"
import { CodeFile } from "../../src/codegen/index.js"
import type { RouteNode } from "../../src/router/router.js"
import { buildJobsFunction, generateBackendServerCode } from "../../src/compiler/prod/backend-program.js"
import { detectExportedMethods } from "../../src/compiler/prod/backend-program-utils.js"

jest.mock("yoctocolors", () => ({
  __esModule: true,
  default: {
    red: (value: string) => value,
    green: (value: string) => value,
    bold: (value: string) => value,
    yellow: (value: string) => value,
    gray: (value: string) => value,
  },
}))

describe("backend-program helpers", () => {
  it("detectExportedMethods recognises mixed export styles", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "peaque-api-"))
    const filePath = path.join(tmpDir, "route.ts")
    fs.writeFileSync(
      filePath,
      `export async function GET() {}
       export const POST = () => {}
       const putHandler = () => {}
       export { putHandler as PUT }`,
      "utf-8",
    )

    const methods = detectExportedMethods(filePath)
    expect(new Set(methods)).toEqual(new Set(["GET", "POST"]))

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})

describe("buildJobsFunction", () => {
  it("registers Cron scheduler and job imports when job files exist", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "peaque-jobs-"))
    const jobDir = path.join(tmpDir, "src", "jobs", "email")
    fs.mkdirSync(jobDir, { recursive: true })
    fs.writeFileSync(
      path.join(jobDir, "job.ts"),
      "export const schedule = ['* * * * *'];\nexport function runJob() {}\n",
      "utf-8",
    )

    const file = new CodeFile()
    buildJobsFunction(tmpDir, file)
    const source = file.toString()

    expect(source).toContain('import { Cron } from "croner";')
    expect(source).toContain('import * as src_jobs_email_job_tsJob from "./src/jobs/email/job.ts";')
    expect(source).toContain("const jobs = []")
    expect(source).toContain("const job = new Cron(schedule, { protect: true }, () => {")
    expect(source).toContain("jobs.push(job)")

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})

describe("generateBackendServerCode", () => {
  it("generates backend program with imports, routes, and bootstrap", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "peaque-backend-"))

    const handlerFile = path.join(tmpDir, "src", "api", "users", "route.ts")
    fs.mkdirSync(path.dirname(handlerFile), { recursive: true })
    fs.writeFileSync(
      handlerFile,
      "export async function GET() { return 'ok' }\nexport async function POST() { return 'ok' }\n",
      "utf-8",
    )

    const jobFile = path.join(tmpDir, "src", "jobs", "email", "job.ts")
    fs.mkdirSync(path.dirname(jobFile), { recursive: true })
    fs.writeFileSync(jobFile, "export const schedule = ['* * * * *']\nexport function runJob() {}\n", "utf-8")

    const startupFile = path.join(tmpDir, "src", "startup.ts")
    fs.mkdirSync(path.dirname(startupFile), { recursive: true })
    fs.writeFileSync(startupFile, "export function init() {}\n", "utf-8")

    const middlewareFile = path.join(tmpDir, "src", "middleware.ts")
    fs.writeFileSync(middlewareFile, "export async function middleware(req, next) { return next() }\n", "utf-8")

    const rpcModule = path.join(tmpDir, "src", "server", "shim.ts")
    fs.mkdirSync(path.dirname(rpcModule), { recursive: true })
    fs.writeFileSync(rpcModule, "export async function greet() { return 'hi' }\n", "utf-8")

    const apiRouter: RouteNode<string> = {
      staticChildren: new Map([
        [
          "users",
          {
            staticChildren: new Map(),
            accept: true,
            names: { handler: handlerFile },
            stacks: {},
          } as RouteNode<string>,
        ],
      ]),
      accept: false,
      names: {},
      stacks: {},
    }

    const pageRouter: RouteNode<string> = {
      staticChildren: new Map(),
      accept: true,
      names: {},
      stacks: { heads: ["default"] },
    }

    const headStacks = new Map<string, { headStack: string[]; html: string }>([
      ["default", { headStack: [], html: "<!doctype html><html></html>" }],
    ])

    const serverShims = [
      {
        shim: "",
        path: rpcModule,
        exportedFunctions: [{ name: "greet" }],
      },
    ]

    const source = generateBackendServerCode(
      apiRouter,
      headStacks,
      pageRouter,
      tmpDir,
      "public",
      serverShims,
      "9.9.9",
    )

    expect(source).toContain('import { Cron } from "croner";')
    expect(source).toContain('import { GET as src_api_users_route_ts_GET, POST as src_api_users_route_ts_POST } from "./src/api/users/route.ts";')
    expect(source).toContain('import * as src_jobs_email_job_tsJob from "./src/jobs/email/job.ts";')
    expect(source).toContain('import * as ServerShim_0 from "./src/server/shim.ts";')
    expect(source).toContain('import superjson from "superjson";')
    expect(source).toContain("const jobs = []")
    expect(source).toContain("export async function makeBackendRouter() {")
    expect(source).toContain('router.addRoute("GET", "/api/users", src_api_users_route_ts_GET)')
    expect(source).toContain('router.addRoute("POST", "/api/users", src_api_users_route_ts_POST)')
    expect(source).toContain('router.addRoute("GET", "/", (req) => { req.type("text/html").send(index_default) })')
    expect(source).toContain("const assetFolderPath = path.join(__dirname, \"public\")")
    expect(source).toContain("// Ensure startup module is loaded for side effects")
    expect(source).toContain("StartupModule;")
    expect(source).toContain("const handler = async (req) => { await executeMiddlewareChain(req, [AbsoluteRootMiddleware], router.getRequestHandler()) }")
    expect(source).toContain('router.addRoute("POST", "/api/__rpc/0/greet", async (req) => { if (!checkCsrfProtection(req)) { req.code(403).send({ error: "Forbidden: Cross-origin request rejected" }); return; } req.send(superjson.stringify(await ServerShim_0.greet(...(superjson.parse(req.rawBody().toString()).args))))})')

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
