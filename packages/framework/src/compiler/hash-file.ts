import { createHash } from "crypto"
import { type FileSystem, realFileSystem } from "../filesystem/index.js"

export async function hashFile(path: string, fileSystem: FileSystem = realFileSystem): Promise<string> {
  const hash = createHash("sha1")
  const content = await fileSystem.readFile(path)
  hash.update(content)
  return hash.digest("hex")
}
