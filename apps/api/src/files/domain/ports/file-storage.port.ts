export const FILE_STORAGE = 'FILE_STORAGE';

export interface IFileStorage {
  move(tmpPath: string, storedName: string): Promise<string>;
  delete(storedPath: string): Promise<void>;
  getAbsolutePath(storedPath: string): string;
  getTmpDir(): string;
}
