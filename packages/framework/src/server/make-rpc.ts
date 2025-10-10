import { ArrowFunction, FunctionDeclaration, FunctionExpression, Node, Project, VariableDeclaration } from "ts-morph"

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

  // Generate the shim code
  let shimCode = `import * as superjson from 'superjson';
const rpcCall = async (funcName, args) => {
  const response = await fetch(\`/api/__rpc/${path}/\${funcName}\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: superjson.stringify({ args })
  });
  if (!response.ok) {
    throw new Error(\`RPC call to \${funcName} failed: \${response.statusText}\`);
  }
  return superjson.parse(await response.text());
};
`
  for (const func of exportedFunctions) {
    if (func.name === "default") {
      shimCode += `export default async (...args) => rpcCall('${func.name}', args);\n`
    } else {
      shimCode += `export const ${func.name} = async (...args) => rpcCall('${func.name}', args);\n`
    }
  }
  return { shim: shimCode, exportedFunctions, path }
}
