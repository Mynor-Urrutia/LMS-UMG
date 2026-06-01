import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { UserRole } from '../../../common/enums/user-role.enum';
import { FILE_REPOSITORY, IFileRepository } from '../../domain/ports/file-repository.port';
import { FILE_STORAGE, IFileStorage } from '../../domain/ports/file-storage.port';
import { FileAssetEntity } from '../../domain/entities/file-asset.entity';
import { IEnrollmentRepository, ENROLLMENT_REPOSITORY } from '../../../enrollments/domain/ports/enrollment-repository.port';
import { EnrollmentStatus } from '../../../enrollments/domain/entities/enrollment.entity';

@Injectable()
export class GetFileUseCase {
  constructor(
    @Inject(FILE_REPOSITORY) private readonly fileRepo: IFileRepository,
    @Inject(FILE_STORAGE) private readonly fileStorage: IFileStorage,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    fileId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<{ entity: FileAssetEntity; absolutePath: string }> {
    const file = await this.fileRepo.findById(fileId);
    if (!file) throw new NotFoundException('File not found');

    // System-generated files (uploaderId === null): only ADMIN may access
    if (file.uploaderId === null) {
      if (requesterRole !== UserRole.ADMIN) {
        throw new ForbiddenException('Access restricted to administrators');
      }
      return { entity: file, absolutePath: this.fileStorage.getAbsolutePath(file.path) };
    }

    if (file.uploaderId === requesterId) {
      return { entity: file, absolutePath: this.fileStorage.getAbsolutePath(file.path) };
    }

    if (requesterRole === UserRole.ADMIN) {
      return { entity: file, absolutePath: this.fileStorage.getAbsolutePath(file.path) };
    }

    const lesson = await this.prisma.lesson.findFirst({
      where: { fileAssetId: fileId },
      select: { module: { select: { courseId: true } } },
    });

    if (lesson) {
      const courseId = lesson.module.courseId;

      const course = await this.prisma.course.findFirst({
        where: { id: courseId, teacherId: requesterId },
        select: { id: true },
      });
      if (course) return { entity: file, absolutePath: this.fileStorage.getAbsolutePath(file.path) };

      const enrollment = await this.enrollmentRepo.findByStudentAndCourse(requesterId, courseId);
      if (enrollment && (enrollment.status === EnrollmentStatus.ACTIVE || enrollment.status === EnrollmentStatus.COMPLETED)) {
        return { entity: file, absolutePath: this.fileStorage.getAbsolutePath(file.path) };
      }
    }

    // Student accessing their own submission file
    const ownSubmission = await this.prisma.submission.findFirst({
      where: { fileAssetId: fileId, studentId: requesterId },
      select: { id: true },
    });
    if (ownSubmission) return { entity: file, absolutePath: this.fileStorage.getAbsolutePath(file.path) };

    // Teacher accessing a submission file from their own course
    if (requesterRole === UserRole.TEACHER) {
      const teacherSubmission = await this.prisma.submission.findFirst({
        where: { fileAssetId: fileId, assignment: { course: { teacherId: requesterId } } },
        select: { id: true },
      });
      if (teacherSubmission) return { entity: file, absolutePath: this.fileStorage.getAbsolutePath(file.path) };
    }

    throw new ForbiddenException('You do not have access to this file');
  }
}
