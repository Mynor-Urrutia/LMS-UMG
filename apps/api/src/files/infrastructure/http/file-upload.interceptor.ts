import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor, UnsupportedMediaTypeException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomBytes } from 'crypto';
import { Observable } from 'rxjs';
import { FILE_STORAGE, IFileStorage } from '../../domain/ports/file-storage.port';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  private readonly inner: NestInterceptor;

  constructor(@Inject(FILE_STORAGE) private readonly fileStorage: IFileStorage) {
    const Inner = FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, this.fileStorage.getTmpDir()),
        filename: (_req, _file, cb) => cb(null, randomBytes(16).toString('hex')),
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(new UnsupportedMediaTypeException(`MIME type not allowed: ${file.mimetype}`), false);
        } else {
          cb(null, true);
        }
      },
    });
    this.inner = new Inner();
  }

  intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    return this.inner.intercept(context, next) as Promise<Observable<unknown>>;
  }
}
