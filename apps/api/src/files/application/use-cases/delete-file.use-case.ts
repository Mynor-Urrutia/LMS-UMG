import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../../common/enums/user-role.enum';
import { FILE_REPOSITORY, IFileRepository } from '../../domain/ports/file-repository.port';
import { FILE_STORAGE, IFileStorage } from '../../domain/ports/file-storage.port';

@Injectable()
export class DeleteFileUseCase {
  constructor(
    @Inject(FILE_REPOSITORY) private readonly fileRepo: IFileRepository,
    @Inject(FILE_STORAGE) private readonly fileStorage: IFileStorage,
  ) {}

  async execute(fileId: string, requesterId: string, requesterRole: UserRole): Promise<void> {
    const file = await this.fileRepo.findById(fileId);
    if (!file) throw new NotFoundException('File not found');

    const isAdmin = requesterRole === UserRole.ADMIN;
    const isOwner = file.uploaderId === requesterId;
    if (!isOwner && !isAdmin) throw new ForbiddenException('Only the uploader or an admin can delete this file');

    // DB record first — it's the source of truth
    await this.fileRepo.delete(fileId);
    try {
      await this.fileStorage.delete(file.path);
    } catch (err) {
      // DB record deleted successfully; log disk cleanup failure for ops
      // Stale file on disk is recoverable; do not fail the request
      console.warn(`[DeleteFileUseCase] Failed to delete file from disk: ${file.path}`, err);
    }
  }
}
