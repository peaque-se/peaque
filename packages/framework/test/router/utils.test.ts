import { MockFileSystem, RealFileSystem, FileSystemEntry } from "../../src/router/utils.js"
import { describe, test, expect, beforeEach } from '@jest/globals'

describe('Router Utils', () => {
  describe('MockFileSystem', () => {
    let mockFs: MockFileSystem

    beforeEach(() => {
      mockFs = new MockFileSystem()
    })

    test('should initialize with empty files map', () => {
      expect(mockFs.readDirectory('/')).toEqual([])
      expect(mockFs.readDirectory('/nonexistent')).toEqual([])
    })

    test('should add directory with entries', () => {
      const entries: FileSystemEntry[] = [
        { name: 'file1.txt', isFile: true, isDirectory: false, path: '/test/file1.txt' },
        { name: 'dir1', isFile: false, isDirectory: true, path: '/test/dir1' }
      ]

      mockFs.addDirectory('/test', entries)

      const result = mockFs.readDirectory('/test')
      expect(result).toEqual(entries)
    })

    test('should return empty array for non-existent directories', () => {
      mockFs.addDirectory('/existing', [
        { name: 'file.txt', isFile: true, isDirectory: false, path: '/existing/file.txt' }
      ])

      expect(mockFs.readDirectory('/nonexistent')).toEqual([])
      expect(mockFs.readDirectory('/existing/subdir')).toEqual([])
    })

    test('should handle multiple directories', () => {
      mockFs.addDirectory('/dir1', [
        { name: 'file1.txt', isFile: true, isDirectory: false, path: '/dir1/file1.txt' }
      ])

      mockFs.addDirectory('/dir2', [
        { name: 'file2.txt', isFile: true, isDirectory: false, path: '/dir2/file2.txt' }
      ])

      expect(mockFs.readDirectory('/dir1')).toHaveLength(1)
      expect(mockFs.readDirectory('/dir1')[0].name).toBe('file1.txt')
      expect(mockFs.readDirectory('/dir2')).toHaveLength(1)
      expect(mockFs.readDirectory('/dir2')[0].name).toBe('file2.txt')
    })

    test('should overwrite directory entries when adding same path', () => {
      const initialEntries: FileSystemEntry[] = [
        { name: 'old.txt', isFile: true, isDirectory: false, path: '/test/old.txt' }
      ]

      const newEntries: FileSystemEntry[] = [
        { name: 'new.txt', isFile: true, isDirectory: false, path: '/test/new.txt' }
      ]

      mockFs.addDirectory('/test', initialEntries)
      expect(mockFs.readDirectory('/test')).toEqual(initialEntries)

      mockFs.addDirectory('/test', newEntries)
      expect(mockFs.readDirectory('/test')).toEqual(newEntries)
    })

    test('should handle empty entries array', () => {
      mockFs.addDirectory('/empty', [])

      expect(mockFs.readDirectory('/empty')).toEqual([])
    })

    test('should handle complex directory structures', () => {
      // Set up a nested structure
      mockFs.addDirectory('/app', [
        { name: 'pages', isFile: false, isDirectory: true, path: '/app/pages' },
        { name: 'components', isFile: false, isDirectory: true, path: '/app/components' }
      ])

      mockFs.addDirectory('/app/pages', [
        { name: 'index.tsx', isFile: true, isDirectory: false, path: '/app/pages/index.tsx' },
        { name: 'users', isFile: false, isDirectory: true, path: '/app/pages/users' }
      ])

      mockFs.addDirectory('/app/pages/users', [
        { name: 'profile.tsx', isFile: true, isDirectory: false, path: '/app/pages/users/profile.tsx' }
      ])

      expect(mockFs.readDirectory('/app')).toHaveLength(2)
      expect(mockFs.readDirectory('/app/pages')).toHaveLength(2)
      expect(mockFs.readDirectory('/app/pages/users')).toHaveLength(1)
    })

    test('joinPath should join paths with forward slashes', () => {
      expect(mockFs.joinPath('a', 'b')).toBe('a/b')
      expect(mockFs.joinPath('a', 'b', 'c')).toBe('a/b/c')
      expect(mockFs.joinPath('/root', 'dir', 'file.txt')).toBe('/root/dir/file.txt')
      expect(mockFs.joinPath()).toBe('.')
      expect(mockFs.joinPath('single')).toBe('single')
    })
  })

  describe('RealFileSystem', () => {
    let realFs: RealFileSystem

    beforeEach(() => {
      realFs = new RealFileSystem()
    })

    test('joinPath should use path/posix join', () => {
      expect(realFs.joinPath('a', 'b')).toBe('a/b')
      expect(realFs.joinPath('a', 'b', 'c')).toBe('a/b/c')
      expect(realFs.joinPath('/root', 'dir', 'file.txt')).toBe('/root/dir/file.txt')
      expect(realFs.joinPath()).toBe('.')
      expect(realFs.joinPath('single')).toBe('single')
    })

    // Note: readDirectory tests would require setting up actual temp directories
    // which is complex in a test environment. The method uses Node.js fs.readdirSync
    // so it's tested indirectly through integration tests in other files.
  })
})