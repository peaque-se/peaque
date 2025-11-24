/// Persistent disk-based cache that survives dev server restarts
/// Caches by filename + hash/version, automatically invalidates stale entries
/// © Peaque Developers 2025

import { createHash } from "crypto"
import path from "path"
import { type FileSystem, realFileSystem } from "../filesystem/index.js"

interface CacheMetadata {
  key: string // filename or module identifier
  hash: string // content hash or version
  timestamp: number
}

interface CacheIndex {
  version: string // cache format version - invalidates all entries on change
  entries: CacheMetadata[]
}

export class DiskCache {
  private cacheDir: string
  private fileSystem: FileSystem
  private metadataCache = new Map<string, CacheMetadata>()
  private cacheVersion: string

  constructor(cacheDir: string, cacheVersion: string = "1", fileSystem: FileSystem = realFileSystem) {
    this.cacheDir = cacheDir
    this.cacheVersion = cacheVersion
    this.fileSystem = fileSystem
    this.ensureCacheDir()
    this.loadMetadataIndex()
  }

  private ensureCacheDir() {
    try {
      if (!this.fileSystem.existsSync(this.cacheDir)) {
        this.fileSystem.mkdirSync(this.cacheDir, { recursive: true })
      }
    } catch (error) {
      console.warn(`Warning: Could not create cache directory ${this.cacheDir}:`, error)
    }
  }

  private loadMetadataIndex() {
    try {
      const indexPath = path.join(this.cacheDir, "index.json")
      if (this.fileSystem.existsSync(indexPath)) {
        const content = this.fileSystem.readFileSync(indexPath, "utf-8") as string
        const index = JSON.parse(content) as CacheIndex

        // Version mismatch - clear entire cache
        if (index.version !== this.cacheVersion) {
          console.log(`[DiskCache] Version mismatch (${index.version} -> ${this.cacheVersion}), clearing cache`)
          this.clearAllFiles()
          return
        }

        // Load entries
        for (const entry of index.entries) {
          this.metadataCache.set(entry.key, entry)
        }
      }
    } catch (error) {
      // Corrupted index, start fresh
      console.warn("Warning: Cache index corrupted, starting fresh")
      this.clearAllFiles()
    }
  }

  private clearAllFiles() {
    try {
      // Delete all files in cache directory
      if (this.fileSystem.existsSync(this.cacheDir)) {
        const files = this.fileSystem.readdirSync(this.cacheDir)
        for (const file of files) {
          try {
            const filePath = path.join(this.cacheDir, file)
            if (this.fileSystem.statSync(filePath).isFile()) {
              this.fileSystem.unlinkSync(filePath)
            }
          } catch (error) {
            // Ignore individual file errors
          }
        }
      }
      this.metadataCache.clear()
    } catch (error) {
      console.warn("Warning: Error clearing cache files:", error)
    }
  }

  private saveMetadataIndex() {
    try {
      const indexPath = path.join(this.cacheDir, "index.json")
      const index: CacheIndex = {
        version: this.cacheVersion,
        entries: Array.from(this.metadataCache.values())
      }
      this.fileSystem.writeFileSync(indexPath, JSON.stringify(index, null, 2))
    } catch (error) {
      console.warn("Warning: Could not save cache index:", error)
    }
  }

  private getCacheFilePath(key: string, hash: string): string {
    // Create a safe filename from key + hash
    const safeKey = key.replace(/[^a-zA-Z0-9@\-_]/g, "_")
    const shortHash = hash.substring(0, 12)
    return path.join(this.cacheDir, `${safeKey}.${shortHash}.cache`)
  }

  /**
   * Get or produce a cached value by key and hash
   * If cache exists for key but hash doesn't match, old entry is discarded
   */
  async cacheByHash(
    key: string,
    hash: string,
    producer: () => Promise<string> | string
  ): Promise<string> {
    try {
      const metadata = this.metadataCache.get(key)

      // Cache hit: key exists and hash matches
      if (metadata && metadata.hash === hash) {
        const cacheFilePath = this.getCacheFilePath(key, hash)

        if (this.fileSystem.existsSync(cacheFilePath)) {
          try {
            const cached = this.fileSystem.readFileSync(cacheFilePath, "utf-8") as string
            return cached
          } catch (error) {
            // File corrupted or unreadable, regenerate
            console.warn(`Warning: Cache file corrupted for ${key}, regenerating`)
          }
        }
      }

      // Cache miss or hash mismatch: delete old entry if exists
      if (metadata && metadata.hash !== hash) {
        const oldCacheFilePath = this.getCacheFilePath(key, metadata.hash)
        try {
          if (this.fileSystem.existsSync(oldCacheFilePath)) {
            this.fileSystem.unlinkSync(oldCacheFilePath)
          }
        } catch (error) {
          // Ignore cleanup errors
        }
      }

      // Generate new value
      const value = await producer()

      // Save to cache
      const cacheFilePath = this.getCacheFilePath(key, hash)
      try {
        this.fileSystem.writeFileSync(cacheFilePath, value)

        // Update metadata
        this.metadataCache.set(key, {
          key,
          hash,
          timestamp: Date.now()
        })
        this.saveMetadataIndex()
      } catch (error) {
        console.warn(`Warning: Could not write cache file for ${key}:`, error)
      }

      return value
    } catch (error) {
      throw error
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { entries: number; cacheDir: string } {
    return {
      entries: this.metadataCache.size,
      cacheDir: this.cacheDir
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    try {
      // Delete all cache files
      for (const metadata of this.metadataCache.values()) {
        const cacheFilePath = this.getCacheFilePath(metadata.key, metadata.hash)
        try {
          if (this.fileSystem.existsSync(cacheFilePath)) {
            this.fileSystem.unlinkSync(cacheFilePath)
          }
        } catch (error) {
          // Ignore individual file errors
        }
      }

      // Clear metadata
      this.metadataCache.clear()
      this.saveMetadataIndex()
    } catch (error) {
      console.warn("Warning: Error clearing cache:", error)
    }
  }
}

/**
 * Helper to create a stable hash for module name + version
 */
export function hashModuleVersion(moduleName: string, version: string): string {
  return createHash("sha1")
    .update(`${moduleName}@${version}`)
    .digest("hex")
}
