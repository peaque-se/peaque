import path from "path"
import { fileURLToPath } from "url"
import { realFileSystem } from "../filesystem/index.js"

const versionFilename = fileURLToPath(import.meta.url)
const versionDirname = path.dirname(versionFilename)
const packageJsonPath = path.join(versionDirname, "..", "..", "package.json")
const packageJson = JSON.parse(realFileSystem.readFileSync(packageJsonPath, "utf-8") as string)
export const platformVersion = packageJson.version
