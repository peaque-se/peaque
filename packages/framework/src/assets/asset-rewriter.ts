// Rewrites asset references in compiled code to use cache-busted paths
import { type FileSystem, realFileSystem } from "../filesystem/index.js"

/**
 * Scans a folder recursively and returns a set of all file paths relative to the folder
 */
async function getPublicAssetPaths(folderPath: string, fileSystem: FileSystem): Promise<Set<string>> {
  const assets = new Set<string>()

  async function scanFiles(dir: string, basePath: string = ""): Promise<void> {
    try {
      const entries = await fileSystem.readdirEntries(dir)
      for (const entry of entries) {
        const fullPath = entry.path
        const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name
        const normalizedRelativePath = relativePath.replace(/\\/g, "/")

        if (entry.isDirectory()) {
          await scanFiles(fullPath, normalizedRelativePath)
        } else if (entry.isFile()) {
          // Skip compressed variants
          if (!entry.name.endsWith('.gz') && !entry.name.endsWith('.br')) {
            assets.add(`/${normalizedRelativePath}`)
          }
        }
      }
    } catch (err) {
      // Folder doesn't exist or isn't readable
    }
  }

  await scanFiles(folderPath)
  return assets
}

/**
 * Rewrites asset references in code to use cache-busted paths
 * @param code - The source code (JS or CSS)
 * @param assetPaths - Set of asset paths that exist (e.g., ['/test.png', '/images/logo.svg'])
 * @param assetPrefix - The cache-busted prefix (e.g., 'assets-12345678')
 * @returns The code with rewritten asset references
 */
export function rewriteAssetReferences(code: string, assetPaths: Set<string>, assetPrefix: string): string {
  let result = code

  // Sort paths by length (longest first) to avoid partial matches
  const sortedPaths = Array.from(assetPaths).sort((a, b) => b.length - a.length)

  for (const assetPath of sortedPaths) {
    // Match patterns like:
    // - "/test.png" (quoted strings)
    // - '/test.png' (quoted strings)
    // - `/test.png` (template literals)
    // - url(/test.png) (CSS urls)
    // - url("/test.png") (CSS urls with quotes)
    // - url('/test.png') (CSS urls with quotes)

    const escapedPath = assetPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Pattern 1: String literals "path" or 'path'
    const stringPattern = new RegExp(`(["'\`])${escapedPath}\\1`, 'g')
    result = result.replace(stringPattern, `$1/${assetPrefix}${assetPath}$1`)

    // Pattern 2: CSS url() without quotes
    const cssUrlPattern = new RegExp(`url\\(${escapedPath}\\)`, 'g')
    result = result.replace(cssUrlPattern, `url(/${assetPrefix}${assetPath})`)
  }

  return result
}

/**
 * Scans public folder and rewrites all asset references in the provided code
 */
export async function rewritePublicAssetReferences(
  code: string,
  publicFolderPath: string,
  assetPrefix: string,
  fileSystem: FileSystem = realFileSystem
): Promise<string> {
  const assetPaths = await getPublicAssetPaths(publicFolderPath, fileSystem)

  if (assetPaths.size === 0) {
    return code // No assets to rewrite
  }

  return rewriteAssetReferences(code, assetPaths, assetPrefix)
}
