/// esbuild plugin to integrate React Compiler (babel-plugin-react-compiler)
/// Transforms React components to optimize re-renders automatically
/// © Peaque Developers 2025

import { Plugin } from "esbuild"
import { transformSync } from "@babel/core"
import reactCompiler from "babel-plugin-react-compiler"
// @ts-ignore - No types available for @babel/preset-typescript
import presetTypescript from "@babel/preset-typescript"
import { realFileSystem } from "../filesystem/index.js"

interface ReactCompilerOptions {
  enabled?: boolean
  compilationMode?: "strict" | "all" | "annotation"
}

/**
 * esbuild plugin that applies React Compiler transformations using Babel
 *
 * The React Compiler automatically optimizes React components by:
 * - Automatically memoizing components and hooks
 * - Reducing unnecessary re-renders
 * - Optimizing dependency arrays
 *
 * @param options - Configuration options for the React Compiler
 * @returns esbuild Plugin
 */
export function reactCompilerPlugin(options: ReactCompilerOptions = {}): Plugin {
  const { enabled = true, compilationMode = "all" } = options

  return {
    name: "react-compiler",
    setup(build) {
      if (!enabled) {
        return
      }

      // Process .tsx and .jsx files (React components)
      build.onLoad({ filter: /\.(tsx|jsx)$/ }, async (args) => {
        // Skip node_modules to avoid transforming third-party code
        if (args.path.includes("node_modules")) {
          return null
        }

        const contents = await realFileSystem.readFileText(args.path, "utf8")

        try {
          // Use Babel to transform the code with React Compiler
          const result = transformSync(contents, {
            filename: args.path,
            presets: [
              [presetTypescript, { isTSX: true, allExtensions: true }],
            ],
            plugins: [
              [
                reactCompiler,
                {
                  compilationMode,
                },
              ],
            ],
            sourceMaps: false,
            configFile: false,
            babelrc: false,
          })

          if (!result || !result.code) {
            return null
          }

          return {
            contents: result.code,
            loader: "tsx",
          }
        } catch (error) {
          // If transformation fails, log warning and return original content
          // This ensures the build doesn't fail if React Compiler encounters issues
          console.warn(`React Compiler warning for ${args.path}:`, error)
          return null
        }
      })
    },
  }
}
