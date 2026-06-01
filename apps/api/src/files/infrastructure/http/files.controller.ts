import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { createReadStream } from 'fs';
import { stat as fsStat } from 'fs/promises';
import * as path from 'path';
import { Response } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../common/enums/user-role.enum';
import { FILE_STORAGE, IFileStorage } from '../../domain/ports/file-storage.port';
import { FileUploadInterceptor } from './file-upload.interceptor';
import { UploadFileUseCase } from '../../application/use-cases/upload-file.use-case';
import { GetFileUseCase } from '../../application/use-cases/get-file.use-case';
import { DeleteFileUseCase } from '../../application/use-cases/delete-file.use-case';

const EXTENSION_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(
    @Inject(FILE_STORAGE) private readonly fileStorage: IFileStorage,
    private readonly uploadFileUseCase: UploadFileUseCase,
    private readonly getFileUseCase: GetFileUseCase,
    private readonly deleteFileUseCase: DeleteFileUseCase,
  ) {}

  @Post()
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload a file (MIME whitelist: images, pdf, mp4/mov/webm, doc/docx, ppt/pptx, xls/xlsx; max 50MB)' })
  @UseInterceptors(FileUploadInterceptor)
  async upload(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: JwtPayload) {
    if (!file) throw new BadRequestException('No file provided');
    const result = await this.uploadFileUseCase.execute(file, user.sub);
    return { ...result, sizeBytes: result.sizeBytes.toString() };
  }

  @Get(':fileId')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Download a file (ACL: uploader, admin, enrolled student, course teacher)' })
  async download(
    @Param('fileId', ParseCuidPipe) fileId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const { entity, absolutePath } = await this.getFileUseCase.execute(fileId, user.sub, user.role);

    try {
      await fsStat(absolutePath);
    } catch {
      throw new NotFoundException('File not found on disk');
    }

    const ext = path.extname(entity.storedName).toLowerCase();
    const safeContentType = EXTENSION_MIME[ext] ?? 'application/octet-stream';

    res.set({
      'Content-Type': safeContentType,
      'Content-Length': entity.sizeBytes.toString(),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(entity.originalName)}`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    });

    const stream = createReadStream(absolutePath);
    stream.on('error', (_err) => {
      if (!res.headersSent) {
        res.status(404).end();
      } else {
        res.destroy();
      }
    });
    stream.pipe(res);
  }

  @Get(':fileId/preview')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stream the PDF preview of an Office file (inline)' })
  async preview(
    @Param('fileId', ParseCuidPipe) fileId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const { entity } = await this.getFileUseCase.execute(fileId, user.sub, user.role);

    if (!entity.pdfPath) {
      throw new NotFoundException('No PDF preview available for this file');
    }

    const absolutePath = this.fileStorage.getAbsolutePath(entity.pdfPath);

    try {
      await fsStat(absolutePath);
    } catch {
      throw new NotFoundException('Preview file not found on disk');
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    });

    const stream = createReadStream(absolutePath);
    stream.on('error', (_err) => {
      if (!res.headersSent) res.status(404).end();
      else res.destroy();
    });
    stream.pipe(res);
  }

  @Delete(':fileId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a file (uploader or admin only)' })
  async remove(@Param('fileId', ParseCuidPipe) fileId: string, @CurrentUser() user: JwtPayload) {
    await this.deleteFileUseCase.execute(fileId, user.sub, user.role);
  }
}
