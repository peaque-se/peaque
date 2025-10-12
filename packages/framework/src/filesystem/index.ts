import { NodeFileSystem } from './node-file-system.js'
import { type FileSystem } from './file-system.js'

export { type FileSystem, type FileStat, type DirectoryEntry } from './file-system.js'
export { NodeFileSystem } from './node-file-system.js'
export { MockFileSystem } from './mock-file-system.js'

export const realFileSystem: FileSystem = new NodeFileSystem()
