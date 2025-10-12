import path from 'path';
import zlib from 'zlib';
import { type FileSystem, realFileSystem } from '../filesystem/index.js';

interface PrecompressResult {
  files: string[];
}

/// Find all files in a folder and compress them using gzip and brotli
/// Save the compressed files alongside the original files with .gz and .br extensions
/// Skip files that are already compressed (.gz, .br)

export async function precompressAssets(folderPath: string, fileSystem: FileSystem = realFileSystem): Promise<PrecompressResult> {
  async function getAllFiles(dirPath: string): Promise<string[]> {
    const files = await fileSystem.readdir(dirPath);
    const allFiles: string[] = [];
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = await fileSystem.stat(fullPath);
      if (stat.isDirectory()) {
        allFiles.push(...await getAllFiles(fullPath));
      } else {
        allFiles.push(fullPath);
      }
    }
    return allFiles;
  }

  const files = await getAllFiles(folderPath);
  const resultFiles: string[] = [];
  for (const file of files) {
    if (file.endsWith('.gz') || file.endsWith('.br')) continue;
    const stat = await fileSystem.stat(file);
    resultFiles.push(file);
    let needGzip = true;
    let needBrotli = true;
    try {
      const gzStat = await fileSystem.stat(file + '.gz');
      if (gzStat.mtime.getTime() === stat.mtime.getTime()) {
        needGzip = false;
      }
    } catch {}
    try {
      const brStat = await fileSystem.stat(file + '.br');
      if (brStat.mtime.getTime() === stat.mtime.getTime()) {
        needBrotli = false;
      }
    } catch {}
    if (!needGzip && !needBrotli) continue;
    const content = await fileSystem.readFile(file);
    if (needGzip) {
      const gzipped = await new Promise<Buffer>((resolve, reject) => {
        zlib.gzip(content, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
      await fileSystem.writeFile(file + '.gz', gzipped);
      await fileSystem.utimes(file + '.gz', stat.atime, stat.mtime);
    }
    if (needBrotli) {
      const brotlied = await new Promise<Buffer>((resolve, reject) => {
        zlib.brotliCompress(content, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
      await fileSystem.writeFile(file + '.br', brotlied);
      await fileSystem.utimes(file + '.br', stat.atime, stat.mtime);
    }
  }
  return { files: resultFiles };
}
