import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { IFileRepository, ICreateFileData } from '../../domain/ports/file-repository.port';
import { FileAssetEntity } from '../../domain/entities/file-asset.entity';

const FILE_ASSET_SELECT = {
  id: true,
  uploaderId: true,
  originalName: true,
  storedName: true,
  mimeType: true,
  sizeBytes: true,
  path: true,
  pdfStoredName: true,
  pdfPath: true,
  createdAt: true,
} as const;

type FileAssetRow = Prisma.FileAssetGetPayload<{ select: typeof FILE_ASSET_SELECT }>;

@Injectable()
export class PrismaFilesAdapter implements IFileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ICreateFileData): Promise<FileAssetEntity> {
    const row = await this.prisma.fileAsset.create({
      data: {
        uploaderId: data.uploaderId,
        originalName: data.originalName,
        storedName: data.storedName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        path: data.path,
        pdfStoredName: data.pdfStoredName ?? null,
        pdfPath: data.pdfPath ?? null,
      },
      select: FILE_ASSET_SELECT,
    });
    return this.toEntity(row);
  }

  async findById(id: string): Promise<FileAssetEntity | null> {
    const row = await this.prisma.fileAsset.findUnique({ where: { id }, select: FILE_ASSET_SELECT });
    return row ? this.toEntity(row) : null;
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.fileAsset.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('File not found');
      }
      throw err;
    }
  }

  private toEntity(row: FileAssetRow): FileAssetEntity {
    return {
      id: row.id,
      uploaderId: row.uploaderId,
      originalName: row.originalName,
      storedName: row.storedName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      path: row.path,
      pdfStoredName: row.pdfStoredName,
      pdfPath: row.pdfPath,
      createdAt: row.createdAt,
    };
  }
}
