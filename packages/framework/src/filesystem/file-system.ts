export interface FileStat {
  isDirectory(): boolean
  isFile(): boolean
  mtime: Date
  atime: Date
  size: number
}

export interface DirectoryEntry {
  name: string
  path: string
  isDirectory(): boolean
  isFile(): boolean
}

export interface FileSystem {
  readdir(path: string): Promise<string[]>
  readdirSync(path: string): string[]
  readdirEntries(path: string): Promise<DirectoryEntry[]>
  readdirEntriesSync(path: string): DirectoryEntry[]
  stat(path: string): Promise<FileStat>
  statSync(path: string): FileStat
  readFile(path: string): Promise<Buffer>
  readFileText(path: string, encoding: BufferEncoding): Promise<string>
  readFileSync(path: string, encoding?: BufferEncoding): string | Buffer
  writeFile(path: string, data: string | Uint8Array): Promise<void>
  writeFileSync(path: string, data: string | Uint8Array): void
  utimes(path: string, atime: Date | number, mtime: Date | number): Promise<void>
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>
  mkdirSync(path: string, options?: { recursive?: boolean }): void
  exists(path: string): Promise<boolean>
  existsSync(path: string): boolean
  unlink(path: string): Promise<void>
  unlinkSync(path: string): void
  accessSync(path: string): void
  copy(source: string, destination: string, options?: { recursive?: boolean }): Promise<void>
}
