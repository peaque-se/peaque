import { parseSync } from "oxc-parser"
import type { ModuleExportName } from "oxc-parser"
import { CodeFile } from "../codegen/index.js"

/**
 * Helper to extract name from ModuleExportName (handles both Identifier and StringLiteral)
 */
function getExportName(node: ModuleExportName): string {
  return node.type === "Identifier" ? node.name : node.value
}

export type ServerShim = {
  shim: string
  path: string
  exportedFunctions: { name: string }[]
}

/**
 * Generate RPC shim for 'use server' files
 * Uses oxc-parser (Rust-based parser) for fast parsing
 */
export async function makeRpcShim(sourceContent: string, path: string): Promise<ServerShim> {
  const parsed = parseSync("temp.ts", sourceContent, { sourceType: "module" })

  if (parsed.errors.length > 0) {
    throw new Error(`Failed to parse source file: ${parsed.errors[0].message}`)
  }

  const exportedFunctions: { name: string }[] = []

  // Walk through the AST to find exported functions
  const program = parsed.program

  // Build a map of local function declarations
  const localFunctions = new Map<string, boolean>() // name -> isAsync

  for (const stmt of program.body) {
    // Track local function declarations
    if (stmt.type === "FunctionDeclaration" && stmt.id?.name) {
      localFunctions.set(stmt.id.name, stmt.async)
    } else if (stmt.type === "VariableDeclaration") {
      for (const declarator of stmt.declarations) {
        if (declarator.id.type === "Identifier" && declarator.init) {
          const init = declarator.init
          if (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression") {
            localFunctions.set(declarator.id.name, init.async)
          }
        }
      }
    }

    // Handle: export async function foo() {}
    if (stmt.type === "ExportNamedDeclaration" && stmt.declaration) {
      const decl = stmt.declaration

      if (decl.type === "FunctionDeclaration") {
        if (!decl.async) {
          throw new Error(`Exported function ${decl.id?.name ?? "unknown"} is not async`)
        }
        if (decl.id?.name) {
          exportedFunctions.push({ name: decl.id.name })
        }
      } else if (decl.type === "VariableDeclaration") {
        for (const declarator of decl.declarations) {
          if (declarator.init) {
            const init = declarator.init
            if (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression") {
              if (!init.async) {
                const name = declarator.id.type === "Identifier" ? declarator.id.name : "unknown"
                throw new Error(`Exported function ${name} is not async`)
              }
              if (declarator.id.type === "Identifier") {
                exportedFunctions.push({ name: declarator.id.name })
              }
            }
          }
        }
      }
    }

    // Handle: export { foo, bar }
    if (stmt.type === "ExportNamedDeclaration" && !stmt.declaration && !stmt.source) {
      if (stmt.specifiers) {
        for (const spec of stmt.specifiers) {
          if (spec.type === "ExportSpecifier") {
            const localName = getExportName(spec.local)
            const exportName = getExportName(spec.exported)

            const isAsync = localFunctions.get(localName)
            if (isAsync === undefined) {
              // Not a function we know about, skip it (could be a variable, type, etc.)
              continue
            }
            if (!isAsync) {
              throw new Error(`Exported function ${exportName} is not async`)
            }
            exportedFunctions.push({ name: exportName })
          }
        }
      }
    }

    // Handle: export { foo } from './other' - Re-exports from other files
    // These cannot be validated without resolving imports, so we skip validation
    // The RPC call will fail at runtime if they're not async
    if (stmt.type === "ExportNamedDeclaration" && stmt.source) {
      // Note: We cannot validate re-exported functions without resolving the imported file
      // This is a limitation compared to ts-morph which has full type resolution
      for (const spec of stmt.specifiers || []) {
        if (spec.type === "ExportSpecifier") {
          const exportName = getExportName(spec.exported)
          exportedFunctions.push({ name: exportName })
        }
      }
    }

    // Handle: export * from './other'
    if (stmt.type === "ExportAllDeclaration") {
      // Cannot determine what's being exported without resolving the imported file
      // This is a significant limitation - we'd need to parse the imported file
      throw new Error("export * from '...' is not supported in 'use server' files. Please use named exports instead.")
    }

    // Handle: export default async function() {}
    if (stmt.type === "ExportDefaultDeclaration") {
      const decl = stmt.declaration
      if (decl.type === "FunctionDeclaration" ||
          decl.type === "ArrowFunctionExpression" ||
          decl.type === "FunctionExpression") {
        if (!decl.async) {
          throw new Error(`Exported function default is not async`)
        }
        exportedFunctions.push({ name: "default" })
      } else if (decl.type === "Identifier") {
        // Handle: export default foo (where foo is defined elsewhere)
        const isAsync = localFunctions.get(decl.name)
        if (isAsync === undefined) {
          throw new Error(`Cannot determine if default export '${decl.name}' is an async function`)
        }
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
