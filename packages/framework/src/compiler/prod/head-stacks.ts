import path from "path"
import { mergeHead, renderHead } from "../../client/head.js"
import { ModuleLoader } from "../../hmr/module-loader.js"
import type { HeadDefinition } from "../../index.js"
import type { RouteNode } from "../../router/router.js"
import { type FileSystem, realFileSystem } from "../../filesystem/index.js"

export async function extractHeadStacks(
  router: RouteNode<string>,
  basePath: string,
  pagesDir: string,
  assetPath: string,
  fileSystem: FileSystem = realFileSystem,
): Promise<Map<string, { headStack: string[]; html: string }>> {
  const defaultHead: HeadDefinition = {
    title: "Peaque Framework Application",
    meta: [
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "description", content: "A Peaque Framework Application" },
    ],
    link: [{ rel: "stylesheet", href: `/${assetPath}/peaque.css` }],
  }

  const headLoader = new ModuleLoader({ absWorkingDir: basePath, fileSystem })
  const headStacks = new Map<string, { headStack: string[]; html: string }>()
  const routesToProcess: Array<{ path: string; headStack: string[] }> = []

  function traverse(node: RouteNode<string>, currentPath: string, accumulatedHeads: string[]) {
    const heads = node.stacks?.heads ? [...accumulatedHeads, ...node.stacks.heads] : accumulatedHeads

    if (node.accept) {
      routesToProcess.push({ path: currentPath || "/", headStack: heads })
    }

    for (const [key, child] of node.staticChildren.entries()) {
      traverse(child, currentPath + "/" + key, heads)
    }
    if (node.paramChild) {
      traverse(node.paramChild, currentPath + "/:" + node.paramChild.paramName, heads)
    }
    if (node.wildcardChild) {
      traverse(node.wildcardChild, currentPath + "/*" + node.wildcardChild.paramName, heads)
    }
  }

  traverse(router, "", [])

  for (const route of routesToProcess) {
    const stackKey =
      route.headStack.length > 0
        ? route.headStack.map((f) => f.replace(/[^a-zA-Z0-9]/g, "_")).join("_")
        : "default"

    if (!headStacks.has(stackKey)) {
      let head = defaultHead

      for (const headFile of route.headStack) {
        let filename = path.isAbsolute(headFile) ? headFile : path.join(pagesDir, headFile)
        filename = path.dirname(filename) + "/head.ts"
        try {
          const mod = await headLoader.loadModule(filename)
          head = mergeHead(head, mod.default)
        } catch (err) {
          console.warn(`Warning: Could not load head file ${filename}:`, err)
        }
      }

      const renderedHead = renderHead(head, `/${assetPath}`)
      const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${renderedHead}
</head>
<body>
<div id="peaque"></div>
<script type="module" src="/${assetPath}/peaque.js"></script>
</body>
</html>`

      headStacks.set(stackKey, { headStack: route.headStack, html: indexHtml })
    }
  }

  if (headStacks.size === 0) {
    const renderedHead = renderHead(defaultHead, `/${assetPath}`)
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${renderedHead}
</head>
<body>
<div id="peaque"></div>
<script type="module" src="/${assetPath}/peaque.js"></script>
</body>
</html>`
    headStacks.set("default", { headStack: [], html: indexHtml })
  }

  return headStacks
}
