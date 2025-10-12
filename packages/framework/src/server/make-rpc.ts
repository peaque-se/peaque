import { ArrowFunction, FunctionDeclaration, FunctionExpression, Node, Project, VariableDeclaration } from "ts-morph"
import { CodeFile } from "../codegen/index.js"

export type ServerShim = {
  shim: string
  path: string
  exportedFunctions: { name: string }[]
}

export async function makeRpcShim(sourceContent: string, path: string): Promise<ServerShim> {
  const project = new Project()
  const sourceFile = project.createSourceFile("temp.ts", sourceContent)

  const exportedFunctions: { name: string }[] = []

  for (const [name, declarations] of sourceFile.getExportedDeclarations()) {
    for (const decl of declarations) {
      if (Node.isFunctionDeclaration(decl)) {
        const func = decl as FunctionDeclaration
        if (!func.isAsync()) {
          throw new Error(`Exported function ${name} is not async`)
        }
        exportedFunctions.push({ name })
      } else if (Node.isVariableDeclaration(decl)) {
        const varDecl = decl as VariableDeclaration
        const initializer = varDecl.getInitializer()
        if (initializer) {
          if (Node.isArrowFunction(initializer)) {
            const arrow = initializer as ArrowFunction
            if (!arrow.isAsync()) {
              throw new Error(`Exported function ${name} is not async`)
            }
            exportedFunctions.push({ name })
          } else if (Node.isFunctionExpression(initializer)) {
            const funcExpr = initializer as FunctionExpression
            if (!funcExpr.isAsync()) {
              throw new Error(`Exported function ${name} is not async`)
            }
            exportedFunctions.push({ name })
          }
        }
      }
    }
  }

  const exportAssignments = sourceFile.getExportAssignments()
  for (const assign of exportAssignments) {
    if (!assign.isExportEquals()) {
      const expr = assign.getExpression()
      if (Node.isFunctionDeclaration(expr) || Node.isArrowFunction(expr) || Node.isFunctionExpression(expr)) {
        const isAsync = expr.getAsyncKeyword() !== undefined
        if (!isAsync) {
          throw new Error(`Exported function default is not async`)
        }
        exportedFunctions.push({ name: "default" })
      }
    }
  }

  const file = new CodeFile()
  file.addNamespaceImport("superjson", "superjson")
  const body = file.body

  body.block("const rpcCall = async (funcName, args) => {", rpcBuilder => {
    rpcBuilder.block(`const response = await fetch(\`/api/__rpc/${path}/\${funcName}\`, {`, responseBuilder => {
      responseBuilder.line(`method: "POST",`)
      responseBuilder.line(`headers: { "Content-Type": "application/json" },`)
      responseBuilder.line(`body: superjson.stringify({ args }),`)
    }, { close: "});" })
    rpcBuilder.block("if (!response.ok) {", guardBuilder => {
      guardBuilder.line("throw new Error(`RPC call to \${funcName} failed: \${response.statusText}`);")
    })
    rpcBuilder.line("return superjson.parse(await response.text());")
  }, { close: "};" })

  if (exportedFunctions.length > 0) {
    body.blankLine()
  }

  for (const func of exportedFunctions) {
    if (func.name === "default") {
      body.line("export default async (...args) => rpcCall('default', args);")
    } else {
      body.line(`export const ${func.name} = async (...args) => rpcCall('${func.name}', args);`)
    }
  }

  return { shim: file.toString(), exportedFunctions, path }
}
