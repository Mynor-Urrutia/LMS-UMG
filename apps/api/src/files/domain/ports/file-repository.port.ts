import { FileAssetEntity } from '../entities/file-asset.entity';

export const FILE_REPOSITORY = 'FILE_REPOSITORY';

export interface ICreateFileData {
  uploaderId?: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: bigint;
  path: string;
  pdfStoredName?: string | null;
  pdfPath?: string | null;
}

export interface IFileRepository {
  create(data: ICreateFileData): Promise<FileAssetEntity>;
  findById(id: string): Promise<FileAssetEntity | null>;
  delete(id: string): Promise<void>;
}
