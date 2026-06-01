import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { FILE_REPOSITORY } from './domain/ports/file-repository.port';
import { FILE_STORAGE } from './domain/ports/file-storage.port';
import { PrismaFilesAdapter } from './infrastructure/adapters/prisma-files.adapter';
import { LocalFileStorageAdapter } from './infrastructure/adapters/local-file-storage.adapter';
import { FilesController } from './infrastructure/http/files.controller';
import { FileUploadInterceptor } from './infrastructure/http/file-upload.interceptor';
import { UploadFileUseCase } from './application/use-cases/upload-file.use-case';
import { GetFileUseCase } from './application/use-cases/get-file.use-case';
import { DeleteFileUseCase } from './application/use-cases/delete-file.use-case';

@Module({
  imports: [PrismaModule, EnrollmentsModule],
  controllers: [FilesController],
  providers: [
    { provide: FILE_REPOSITORY, useClass: PrismaFilesAdapter },
    { provide: FILE_STORAGE, useClass: LocalFileStorageAdapter },
    FileUploadInterceptor,
    UploadFileUseCase,
    GetFileUseCase,
    DeleteFileUseCase,
  ],
  exports: [FILE_REPOSITORY, FILE_STORAGE],
})
export class FilesModule {}
