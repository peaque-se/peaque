import { type FileSystem, realFileSystem } from "../../filesystem/index.js"

export function detectExportedMethods(filePath: string, fileSystem: FileSystem = realFileSystem): string[] {
  const fileContent = fileSystem.readFileSync(filePath, "utf-8") as string
  const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"]
  const exportedMethods: string[] = []

  for (const method of methods) {
    const exportRegex = new RegExp(`export\\s+(?:async\\s+)?(?:function|const|let|var)\\s+${method}\\b`, "m")
    if (exportRegex.test(fileContent)) {
      exportedMethods.push(method)
    }
  }

  return exportedMethods
}
