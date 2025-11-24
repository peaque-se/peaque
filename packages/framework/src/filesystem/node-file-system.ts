import * as fs from 'fs'
import { promises as fsp } from 'fs'
import path from 'path'
import { DirectoryEntry, FileStat, FileSystem } from './file-system.js'

export class NodeFileSystem implements FileSystem {
  async readdir(target: string): Promise<string[]> {
    return fsp.readdir(target)
  }

  readdirSync(target: string): string[] {
    return fs.readdirSync(target)
  }

  async readdirEntries(target: string): Promise<DirectoryEntry[]> {
    const entries = await fsp.readdir(target, { withFileTypes: true })
    return this.mapDirEntries(entries, target)
  }

  readdirEntriesSync(target: string): DirectoryEntry[] {
    const entries = fs.readdirSync(target, { withFileTypes: true })
    return this.mapDirEntries(entries, target)
  }

  async stat(target: string): Promise<FileStat> {
    const stats = await fsp.stat(target)
    return this.toFileStat(stats)
  }

  statSync(target: string): FileStat {
    const stats = fs.statSync(target)
    return this.toFileStat(stats)
  }

  async lstat(target: string): Promise<FileStat> {
    const stats = await fsp.lstat(target)
    return this.toFileStat(stats)
  }

  lstatSync(target: string): FileStat {
    const stats = fs.lstatSync(target)
    return this.toFileStat(stats)
  }

  async readFile(target: string): Promise<Buffer> {
    return fsp.readFile(target)
  }

  async readFileText(target: string, encoding: BufferEncoding): Promise<string> {
    return fsp.readFile(target, encoding)
  }

  readFileSync(target: string, encoding?: BufferEncoding): string | Buffer {
    return encoding ? fs.readFileSync(target, encoding) : fs.readFileSync(target)
  }

  async writeFile(target: string, data: string | Uint8Array): Promise<void> {
    await fsp.writeFile(target, data)
  }

  writeFileSync(target: string, data: string | Uint8Array): void {
    fs.writeFileSync(target, data)
  }

  async utimes(target: string, atime: Date | number, mtime: Date | number): Promise<void> {
    await fsp.utimes(target, atime as number | Date, mtime as number | Date)
  }

  async mkdir(target: string, options?: { recursive?: boolean }): Promise<void> {
    await fsp.mkdir(target, options)
  }

  mkdirSync(target: string, options?: { recursive?: boolean }): void {
    fs.mkdirSync(target, options)
  }

  async exists(target: string): Promise<boolean> {
    try {
      await fsp.access(target)
      return true
    } catch {
      return false
    }
  }

  existsSync(target: string): boolean {
    return fs.existsSync(target)
  }

  async unlink(target: string): Promise<void> {
    await fsp.unlink(target)
  }

  unlinkSync(target: string): void {
    fs.unlinkSync(target)
  }

  accessSync(target: string): void {
    fs.accessSync(target)
  }

  async copy(source: string, destination: string, options: { recursive?: boolean } = {}): Promise<void> {
    const cp = (fsp as unknown as { cp?: typeof fsp.cp }).cp
    if (typeof cp === 'function') {
      await cp(source, destination, options)
      return
    }
    await this.copyFallback(source, destination, options)
  }

  private mapDirEntries(entries: fs.Dirent[], root: string): DirectoryEntry[] {
    return entries.map((entry) => ({
      name: entry.name,
      path: path.join(root, entry.name),
      isDirectory: () => entry.isDirectory(),
      isFile: () => entry.isFile(),
    }))
  }

  private toFileStat(stats: fs.Stats): FileStat {
    return {
      isDirectory: () => stats.isDirectory(),
      isFile: () => stats.isFile(),
      isSymbolicLink: () => stats.isSymbolicLink(),
      mtime: stats.mtime,
      atime: stats.atime,
      size: stats.size,
    }
  }

  private async copyFallback(source: string, destination: string, options: { recursive?: boolean }): Promise<void> {
    const stats = await fsp.stat(source)
    if (stats.isDirectory()) {
      if (!options.recursive) {
        throw new Error(`Cannot copy directory without recursive option: ${source}`)
      }
      await fsp.mkdir(destination, { recursive: true })
      const entries = await fsp.readdir(source, { withFileTypes: true })
      for (const entry of entries) {
        const srcPath = path.join(source, entry.name)
        const destPath = path.join(destination, entry.name)
        if (entry.isDirectory()) {
          await this.copyFallback(srcPath, destPath, options)
        } else {
          await fsp.copyFile(srcPath, destPath)
        }
      }
      return
    }
    await fsp.copyFile(source, destination)
  }
}
