import { Inject, Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';
import { FILE_REPOSITORY, IFileRepository } from '../../domain/ports/file-repository.port';
import { FILE_STORAGE, IFileStorage } from '../../domain/ports/file-storage.port';
import { FileAssetEntity } from '../../domain/entities/file-asset.entity';
import { extensionMatchesMagicBytes } from '../../../common/utils/magic-bytes';

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.pdf',
  '.mp4', '.mov', '.webm',
  '.doc', '.docx',
  '.ppt', '.pptx',
  '.xls', '.xlsx',
]);

@Injectable()
export class UploadFileUseCase {
  constructor(
    @Inject(FILE_REPOSITORY) private readonly fileRepo: IFileRepository,
    @Inject(FILE_STORAGE) private readonly fileStorage: IFileStorage,
  ) {}

  async execute(file: Express.Multer.File, uploaderId: string): Promise<FileAssetEntity> {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      await fs.unlink(file.path).catch(() => {});
      throw new UnsupportedMediaTypeException(`File extension not allowed: ${ext || '(none)'}`);
    }

    if (!extensionMatchesMagicBytes(ext, file.path)) {
      await fs.unlink(file.path).catch(() => {});
      throw new UnsupportedMediaTypeException('File content does not match its declared extension');
    }

    const sanitizedOriginalName = path.basename(file.originalname)
      .replace(/[^\w.\-]/g, '_')
      .substring(0, 255);

    const storedName = `${randomUUID()}${ext}`;
    let storedPath: string | undefined;

    try {
      storedPath = await this.fileStorage.move(file.path, storedName);
      return await this.fileRepo.create({
        uploaderId,
        originalName: sanitizedOriginalName,
        storedName,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        path: storedPath,
      });
    } catch (err) {
      if (storedPath !== undefined) {
        await this.fileStorage.delete(storedPath).catch(() => {});
      } else {
        await fs.unlink(file.path).catch(() => {});
      }
      throw err;
    }
  }
}
