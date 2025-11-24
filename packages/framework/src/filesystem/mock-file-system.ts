import path from 'path'
import { DirectoryEntry, FileStat, FileSystem } from './file-system.js'

type DirectoryRecord = {
  type: 'directory'
  children: Set<string>
  atime: Date
  mtime: Date
}

type FileRecord = {
  type: 'file'
  content: Buffer
  atime: Date
  mtime: Date
}

type EntryRecord = DirectoryRecord | FileRecord

const ROOT_PATH = '/'

const normalizePath = (inputPath: string): string => {
  if (!inputPath) return ROOT_PATH
  const replaced = inputPath.replace(/\\/g, '/')
  const normalized = path.posix.normalize(replaced.startsWith('/') ? replaced : `/${replaced}`)
  return normalized === '.' ? ROOT_PATH : normalized
}

const toDate = (value: Date | number): Date => {
  if (value instanceof Date) {
    return new Date(value.getTime())
  }
  if (typeof value === 'number') {
    return new Date(value)
  }
  return new Date()
}

export class MockFileSystem implements FileSystem {
  private readonly entries = new Map<string, EntryRecord>()

  constructor() {
    const now = new Date()
    this.entries.set(ROOT_PATH, { type: 'directory', children: new Set(), atime: now, mtime: now })
  }

  async readdir(targetPath: string): Promise<string[]> {
    return this.readdirSync(targetPath)
  }

  readdirSync(targetPath: string): string[] {
    const dir = this.getDirectoryEntry(targetPath)
    return Array.from(dir.children).sort()
  }

  async readdirEntries(targetPath: string): Promise<DirectoryEntry[]> {
    return this.readdirEntriesSync(targetPath)
  }

  readdirEntriesSync(targetPath: string): DirectoryEntry[] {
    const dir = this.getDirectoryEntry(targetPath)
    return Array.from(dir.children)
      .sort()
      .map((name) => {
        const childPath = normalizePath(path.posix.join(targetPath, name))
        const entry = this.entries.get(childPath)
        if (!entry) {
          throw new Error(`MockFileSystem: inconsistent state, missing entry for ${childPath}`)
        }
        return {
          name,
          path: childPath,
          isDirectory: () => entry.type === 'directory',
          isFile: () => entry.type === 'file',
        }
      })
  }

  async stat(targetPath: string): Promise<FileStat> {
    return this.statSync(targetPath)
  }

  statSync(targetPath: string): FileStat {
    const entry = this.getEntry(targetPath)
    return {
      isDirectory: () => entry.type === 'directory',
      isFile: () => entry.type === 'file',
      isSymbolicLink: () => false, // MockFileSystem doesn't support symlinks
      mtime: new Date(entry.mtime),
      atime: new Date(entry.atime),
      size: entry.type === 'file' ? entry.content.byteLength : this.getDirectoryEntry(targetPath).children.size,
    }
  }

  async lstat(targetPath: string): Promise<FileStat> {
    return this.lstatSync(targetPath)
  }

  lstatSync(targetPath: string): FileStat {
    // MockFileSystem doesn't support symlinks, so lstat is the same as stat
    return this.statSync(targetPath)
  }

  async readFile(targetPath: string): Promise<Buffer> {
    const result = this.readFileSync(targetPath)
    return Buffer.isBuffer(result) ? Buffer.from(result) : Buffer.from(result, 'utf-8')
  }

  readFileSync(targetPath: string, encoding?: BufferEncoding): string | Buffer {
    const entry = this.getFileEntry(targetPath)
    entry.atime = new Date()
    if (encoding) {
      return entry.content.toString(encoding)
    }
    return Buffer.from(entry.content)
  }

  async readFileText(targetPath: string, encoding: BufferEncoding): Promise<string> {
    const value = this.readFileSync(targetPath, encoding)
    return typeof value === 'string' ? value : value.toString(encoding)
  }

  async writeFile(targetPath: string, data: string | Uint8Array): Promise<void> {
    this.writeFileSync(targetPath, data)
  }

  writeFileSync(targetPath: string, data: string | Uint8Array): void {
    const filePath = normalizePath(targetPath)
    const parentPath = path.posix.dirname(filePath)
    this.ensureDirectory(parentPath, { recursive: true })

    const parent = this.getDirectoryEntry(parentPath)
    const now = new Date()
    const buffer = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data)
    const entry: FileRecord = {
      type: 'file',
      content: buffer,
      atime: now,
      mtime: now,
    }
    this.entries.set(filePath, entry)
    parent.children.add(path.posix.basename(filePath))
    parent.mtime = now
  }

  async utimes(targetPath: string, atime: Date | number, mtime: Date | number): Promise<void> {
    const entry = this.getEntry(targetPath)
    entry.atime = toDate(atime)
    entry.mtime = toDate(mtime)
  }

  async mkdir(targetPath: string, options?: { recursive?: boolean }): Promise<void> {
    this.mkdirSync(targetPath, options)
  }

  mkdirSync(targetPath: string, options?: { recursive?: boolean }): void {
    this.ensureDirectory(targetPath, options)
  }

  async exists(targetPath: string): Promise<boolean> {
    return this.existsSync(targetPath)
  }

  existsSync(targetPath: string): boolean {
    const normalized = normalizePath(targetPath)
    return this.entries.has(normalized)
  }

  async unlink(targetPath: string): Promise<void> {
    this.unlinkSync(targetPath)
  }

  unlinkSync(targetPath: string): void {
    const filePath = normalizePath(targetPath)
    const entry = this.entries.get(filePath)
    if (!entry) {
      throw new Error(`MockFileSystem: ${filePath} does not exist`)
    }
    if (entry.type === 'directory' && entry.children.size > 0) {
      throw new Error(`Cannot unlink non-empty directory: ${filePath}`)
    }
    this.entries.delete(filePath)
    if (filePath !== ROOT_PATH) {
      const parentPath = path.posix.dirname(filePath)
      const parent = this.entries.get(parentPath)
      if (parent && parent.type === 'directory') {
        parent.children.delete(path.posix.basename(filePath))
        parent.mtime = new Date()
      }
    }
  }

  accessSync(targetPath: string): void {
    if (!this.existsSync(targetPath)) {
      throw new Error(`MockFileSystem: ${normalizePath(targetPath)} is not accessible`)
    }
  }

  async copy(source: string, destination: string, options: { recursive?: boolean } = {}): Promise<void> {
    this.copyRecursive(source, destination, options)
  }

  /**
   * Helper method for testing: add multiple files and directories at once
   * @param structure - An object where keys are paths and values are either strings (file content) or objects (directories)
   *
   * @example
   * ```typescript
   * mockFs.addFiles({
   *   '/app/page.tsx': 'export default function Page() {}',
   *   '/app/users': {
   *     'page.tsx': 'export default function Users() {}',
   *     '[id]': {
   *       'page.tsx': 'export default function User() {}'
   *     }
   *   }
   * })
   * ```
   */
  addFiles(structure: Record<string, string | Record<string, any>>, basePath: string = ''): void {
    for (const [name, value] of Object.entries(structure)) {
      const fullPath = basePath ? normalizePath(path.posix.join(basePath, name)) : normalizePath(name)

      if (typeof value === 'string') {
        // It's a file
        this.writeFileSync(fullPath, value)
      } else if (typeof value === 'object' && value !== null) {
        // It's a directory
        this.mkdirSync(fullPath, { recursive: true })
        this.addFiles(value, fullPath)
      }
    }
  }

  private copyRecursive(source: string, destination: string, options: { recursive?: boolean }): void {
    const srcEntry = this.getEntry(source)
    if (srcEntry.type === 'file') {
      this.writeFileSync(destination, Buffer.from(srcEntry.content))
      return
    }

    if (!options.recursive) {
      throw new Error(`MockFileSystem: cannot copy directory without recursive option: ${source}`)
    }
    this.mkdirSync(destination, { recursive: true })
    for (const child of this.readdirEntriesSync(source)) {
      const srcChild = child.path
      const destChild = normalizePath(path.posix.join(destination, child.name))
      this.copyRecursive(srcChild, destChild, options)
    }
  }

  private getEntry(targetPath: string): EntryRecord {
    const normalized = normalizePath(targetPath)
    const entry = this.entries.get(normalized)
    if (!entry) {
      throw new Error(`MockFileSystem: ${normalized} does not exist`)
    }
    return entry
  }

  private getDirectoryEntry(targetPath: string): DirectoryRecord {
    const entry = this.getEntry(targetPath)
    if (entry.type !== 'directory') {
      throw new Error(`MockFileSystem: ${normalizePath(targetPath)} is not a directory`)
    }
    return entry
  }

  private getFileEntry(targetPath: string): FileRecord {
    const entry = this.getEntry(targetPath)
    if (entry.type !== 'file') {
      throw new Error(`MockFileSystem: ${normalizePath(targetPath)} is not a file`)
    }
    return entry
  }

  private ensureDirectory(targetPath: string, options?: { recursive?: boolean }): void {
    const dirPath = normalizePath(targetPath)
    if (this.entries.has(dirPath)) {
      const entry = this.entries.get(dirPath)!
      if (entry.type !== 'directory') {
        throw new Error(`MockFileSystem: ${dirPath} already exists and is not a directory`)
      }
      return
    }

    const parentPath = path.posix.dirname(dirPath)
    if (parentPath !== dirPath) {
      if (!this.entries.has(parentPath)) {
        if (options?.recursive) {
          this.ensureDirectory(parentPath, { recursive: true })
        } else {
          throw new Error(`MockFileSystem: parent directory ${parentPath} does not exist`)
        }
      } else {
        const parentEntry = this.entries.get(parentPath)
        if (parentEntry?.type !== 'directory') {
          throw new Error(`MockFileSystem: parent ${parentPath} is not a directory`)
        }
      }
    }

    const now = new Date()
    this.entries.set(dirPath, { type: 'directory', children: new Set(), atime: now, mtime: now })

    if (dirPath !== ROOT_PATH) {
      const parent = this.getDirectoryEntry(parentPath)
      parent.children.add(path.posix.basename(dirPath))
      parent.mtime = now
    }
  }
}
