import path, { basename, extname } from "path"
import { contentTypeRegistry } from "../assets/asset-handler.js"
import { bundleCssFile } from "../compiler/tailwind-bundler.js"
import { fastRefreshify } from "../compiler/fast-refreshify.js"
import { makeImportsRelative } from "../compiler/imports.js"
import type { PeaqueRequest } from "../http/http-types.js"
import { type FileSystem, realFileSystem } from "../filesystem/index.js"

export async function servePeaqueCss(req: PeaqueRequest, basePath: string, fileSystem: FileSystem = realFileSystem): Promise<void> {
  const stylesPath = path.join(basePath, "src/styles.css")
  let css = ""
  if (fileSystem.existsSync(stylesPath)) {
    css = fileSystem.readFileSync(stylesPath, "utf-8") as string
  }
  const bundle = await bundleCssFile(css, basePath)
  req.code(200).header("Content-Type", "text/css").send(bundle)
}

export function servePeaqueMainScript(req: PeaqueRequest, port: number): void {
  const js = `
      import * as runtime from "/@deps/react-refresh/runtime"
      runtime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = (file) => (code, id) => {
        runtime.register(code, file + "-" + id)
      }
      window.$RefreshSig$ = runtime.createSignatureFunctionForTransform
      window.performReactRefresh = runtime.performReactRefresh

      import("/peaque-loader.js?t=" + Date.now())

      const sheet = new CSSStyleSheet()
      document.adoptedStyleSheets = [sheet]
      async function replaceStylesheet(url) {
        const css = await (await fetch(url)).text()
        await sheet.replace(css)
      }
      replaceStylesheet("/peaque.css")
      window.replaceStylesheet = replaceStylesheet
if (typeof window !== 'undefined') {
  let reconnectAttempts = 0;
  const maxAttempts = 5;

  function connect() {
    const ws = new WebSocket('ws://localhost:${port}/hmr');
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      replaceStylesheet("/peaque.css")
      const updatedFile = message.data.path
      let updatePath = "/@src/" + updatedFile + "?t=" + Date.now()
      if (updatedFile === "/peaque.js") {
        updatePath = "/peaque.js?t=" + Date.now()
      }
      import(updatePath).then((mod) => {
        window.performReactRefresh();
      }).catch((err) => {
        console.error("HMR: Error re-importing updated module:", updatedFile, err);
      });
      console.log("HMR message:", message.data.path);

    };
    ws.onclose = () => {
      if (reconnectAttempts++ < maxAttempts) setTimeout(connect, 1000);
    };
  }
  connect();
}`
  req.code(200).header("Content-Type", "application/javascript").send(js)
}

export function servePeaqueLoaderScript(req: PeaqueRequest): void {
  const loaderContent = `
          import { createRoot } from 'react-dom/client';
          import MainApplication from './peaque.js';
          createRoot(document.getElementById('peaque')!).render(<MainApplication />);`
  const refreshifyContent = fastRefreshify(loaderContent, "peaque-loader.js")
  const processedContents = makeImportsRelative(refreshifyContent).replace("/@src/peaque", "/peaque.js")
  req.type("application/javascript").send(processedContents)
}

export function servePeaqueMainHtml(req: PeaqueRequest): void {
  req.code(200).header("Content-Type", "text/html").send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Peaque App</title>
        <link rel="stylesheet" href="/peaque.css" />
        <script type="module" src="/peaque-dev.js"></script>
      </head>
      <body>
        <div id="peaque"></div>
      </body>
      </html>
    `)
}

export function servePublicAsset(req: PeaqueRequest, basePath: string, requestPath: string, fileSystem: FileSystem = realFileSystem): boolean {
  const publicDir = path.join(basePath, "src", "public")
  const requestedPath = path.normalize(requestPath)
  const absoluteFile = path.join(publicDir, requestedPath)

  const resolvedPath = path.resolve(absoluteFile)
  const resolvedPublic = path.resolve(publicDir)
  if (!resolvedPath.startsWith(resolvedPublic + path.sep) && resolvedPath !== resolvedPublic) {
    req.code(403).send("Forbidden")
    return true
  }

  if (!fileSystem.existsSync(resolvedPath) || !fileSystem.statSync(resolvedPath).isFile()) {
    return false
  }

  try {
    fileSystem.accessSync(resolvedPath)
  } catch {
    req.code(403).send("Forbidden")
    return true
  }

  const contents = fileSystem.readFileSync(resolvedPath) as Buffer
  const contentType = contentTypeRegistry[extname(basename(resolvedPath))] || "application/octet-stream"
  req.code(200).header("Content-Type", contentType).send(contents)
  return true
}
