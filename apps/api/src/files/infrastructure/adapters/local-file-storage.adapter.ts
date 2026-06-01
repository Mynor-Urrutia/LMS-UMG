import { Injectable, OnModuleInit } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { IFileStorage } from '../../domain/ports/file-storage.port';

@Injectable()
export class LocalFileStorageAdapter implements IFileStorage, OnModuleInit {
  private readonly uploadsRoot: string;

  constructor() {
    this.uploadsRoot = path.join(process.cwd(), 'uploads');
  }

  async onModuleInit(): Promise<void> {
    await fs.mkdir(path.join(this.uploadsRoot, 'tmp'), { recursive: true });
  }

  async move(tmpPath: string, storedName: string): Promise<string> {
    const now = new Date();
    const yyyy = now.getFullYear().toString();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const destDir = path.join(this.uploadsRoot, yyyy, mm);
    await fs.mkdir(destDir, { recursive: true });
    const destPath = path.join(destDir, storedName);
    try {
      await fs.rename(tmpPath, destPath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'EXDEV') {
        // Cross-filesystem move — fall back to copy + unlink (FIX 8)
        await fs.copyFile(tmpPath, destPath);
        await fs.unlink(tmpPath).catch(() => {});
      } else {
        throw err;
      }
    }
    return path.join(yyyy, mm, storedName);
  }

  async delete(storedPath: string): Promise<void> {
    const absolutePath = this.getAbsolutePath(storedPath);
    await fs.unlink(absolutePath).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'ENOENT') throw err;
    });
  }

  getTmpDir(): string {
    return path.join(this.uploadsRoot, 'tmp');
  }

  getAbsolutePath(storedPath: string): string {
    const resolved = path.resolve(this.uploadsRoot, storedPath);
    if (!resolved.startsWith(this.uploadsRoot + path.sep) && resolved !== this.uploadsRoot) {
      throw new Error('Path traversal detected');
    }
    return resolved;
  }
}
