import path from "path"
import colors from "yoctocolors"
import { CodeBuilder } from "../../codegen/index.js"
import { type FileSystem, realFileSystem } from "../../filesystem/index.js"

export interface ServerlessFrontendOptions {
  outDir: string
  assetPath: string
  renderedHead: string
}

export function writeServerlessIndexHtml(
  { outDir, assetPath, renderedHead }: ServerlessFrontendOptions,
  fileSystem: FileSystem = realFileSystem,
): void {
  const builder = new CodeBuilder()
  builder.line("<!DOCTYPE html>")
  builder.line('<html lang="en">')
  builder.line("<head>")
  builder.indented(headBuilder => {
    headBuilder.line('<meta charset="UTF-8">')
    headBuilder.multiline(renderedHead)
  })
  builder.line("</head>")
  builder.line("<body>")
  builder.indented(bodyBuilder => {
    bodyBuilder.line('<div id="peaque"></div>')
    bodyBuilder.line(`<script type="module" src="/${assetPath}/peaque.js"></script>`)
  })
  builder.line("</body>")
  builder.line("</html>")

  const indexPath = path.join(outDir, "index.html")
  fileSystem.writeFileSync(indexPath, builder.toString())
  console.log(`     ${colors.green("✓")} Generated serverless ${colors.gray("index.html")}`)
}
