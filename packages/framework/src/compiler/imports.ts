/// Manages import path aliases and rewrites import paths to be compatible with the Peaque environment
/// © Peaque Developers 2025
import path from "path"

let globalImportAliases: Record<string, string> = {};

/// Sets up import path aliases based on the provided tsconfig.json
export function setupImportAliases(tsconfigJson:any) {
  const paths = tsconfigJson?.compilerOptions?.paths;
  if (!paths) return {};
  const aliases: Record<string, string> = {};
  for (const alias in paths) {
    const target = paths[alias][0];
    const cleanedAlias = alias.replace(/\/\*$/, '');
    const cleanedTarget = target.replace(/\/\*$/, '');
    aliases[cleanedAlias] = cleanedTarget;
  }
  globalImportAliases = aliases;
  return aliases;
}

/// Makes all import paths in the given file contents relative to the includingPath
/// This is used to rewrite imports to work in the Peaque environment
export function makeImportsRelative(fileContents: string, includingPath: string = ""): string {
  const basePath = path.dirname(includingPath);

  /// Resolves an import path to a Peaque environment path
  function resolvePath(importPath: string): string {
    // Already resolved paths
    if (importPath.startsWith("/@deps/") || importPath.startsWith("/@src/")) {
      return importPath;
    }

    // Strip file extensions
    const stripExtensions = (p: string) =>
      p.replace(/\.(tsx|ts|jsx|js)$/g, "");

    // Relative imports
    if (importPath.startsWith(".")) {
      const resolved = path.join(basePath, importPath).replace(/\\/g, "/");
      return `/@src/${stripExtensions(resolved)}`;
    }

    // Aliased imports
    for (const alias in globalImportAliases) {
      if (importPath === alias) {
        return `/@src/${globalImportAliases[alias]}`;
      }
      if (importPath.startsWith(alias + "/")) {
        const targetPath = globalImportAliases[alias] + importPath.substring(alias.length);
        return `/@src/${targetPath}`;
      }
    }

    // Absolute imports
    if (importPath.startsWith("/")) {
      return `/@src/${importPath}`;
    }

    // External packages
    return `/@deps/${importPath}`;
  }

  /// Rewrites static imports (from 'path')
  const rewriteStaticImport = (match: string, ...args: any[]): string => {
    // The path is always the last capture group before the offset and string args
    const importPath = args[args.length - 3];
    const resolved = resolvePath(importPath);
    // Replace just the path part, keeping the rest of the import statement
    return match.replace(/["']([^"']+)["'](?!.*["'])/, `'${resolved}'`);
  };

  /// Rewrites dynamic imports (import('path'))
  const rewriteDynamicImport = (match: string, importPath: string): string => {
    const resolved = resolvePath(importPath);
    return `import('${resolved}')`;
  };

  let result = fileContents;

  // Rewrite static imports (must start with 'import' keyword or '} from')
  result = result.replace(/\bimport\s+(?:(?:\w+|{[^}]*}|\*\s+as\s+\w+)(?:\s*,\s*(?:\w+|{[^}]*}|\*\s+as\s+\w+))*\s+)?from\s+["']([^"']+)["']/g, rewriteStaticImport);
  result = result.replace(/}\s*from\s+["']([^"']+)["']/g, rewriteStaticImport);

  // Rewrite dynamic imports (lazy loading)
  result = result.replace(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g, rewriteDynamicImport);

  return result;
}