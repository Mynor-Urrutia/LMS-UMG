import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../../assignments/domain/ports/assignment-repository.port';
import { AssignmentType } from '../../../assignments/domain/entities/assignment.entity';
import { IEnrollmentRepository, ENROLLMENT_REPOSITORY } from '../../../enrollments/domain/ports/enrollment-repository.port';
import { EnrollmentStatus } from '../../../enrollments/domain/entities/enrollment.entity';
import { IFileRepository, FILE_REPOSITORY } from '../../../files/domain/ports/file-repository.port';
import { ISubmissionRepository, SUBMISSION_REPOSITORY } from '../../domain/ports/submission-repository.port';
import { SubmissionEntity } from '../../domain/entities/submission.entity';
import { UpdateSubmissionDto } from '../dtos/update-submission.dto';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class UpdateSubmissionUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
    @Inject(FILE_REPOSITORY) private readonly fileRepo: IFileRepository,
    @Inject(SUBMISSION_REPOSITORY) private readonly submissionRepo: ISubmissionRepository,
  ) {}

  async execute(courseId: string, assignmentId: string, submissionId: string, dto: UpdateSubmissionDto, actorId: string, actorRole: UserRole): Promise<SubmissionEntity> {
    if (actorRole === UserRole.TEACHER) {
      throw new ForbiddenException('Teachers cannot modify student submissions');
    }

    if (dto.textContent === undefined && dto.fileAssetId === undefined) {
      throw new BadRequestException('At least one field must be provided');
    }

    const [course, assignment] = await Promise.all([
      this.courseRepo.findById(courseId),
      this.assignmentRepo.findById(assignmentId),
    ]);

    if (!course) throw new NotFoundException('Course not found');
    if (!assignment || assignment.courseId !== courseId) throw new NotFoundException('Assignment not found');

    const submission = await this.submissionRepo.findById(submissionId);
    if (!submission || submission.assignmentId !== assignmentId) throw new NotFoundException('Submission not found');

    let isNowLate: boolean | undefined;

    if (actorRole === UserRole.STUDENT) {
      if (submission.studentId !== actorId) throw new NotFoundException('Submission not found');

      const now = new Date();
      isNowLate = assignment.dueDate !== null && now > assignment.dueDate;

      if (isNowLate && !assignment.allowLate) {
        throw new ForbiddenException('This assignment does not accept late submissions');
      }

      const [graded, enrollment] = await Promise.all([
        this.submissionRepo.hasGrade(submissionId),
        this.enrollmentRepo.findByStudentAndCourse(actorId, courseId),
      ]);

      if (graded) throw new ConflictException('Cannot update a submission that has already been graded');
      if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
        throw new ForbiddenException('An active enrollment is required to update a submission');
      }
    }

    const effectiveTextContent = dto.textContent !== undefined ? dto.textContent : submission.textContent;
    const effectiveFileAssetId = dto.fileAssetId !== undefined ? dto.fileAssetId : submission.fileAssetId;

    if (assignment.type === AssignmentType.TEXT && (effectiveTextContent == null || effectiveTextContent.trim() === '')) {
      throw new BadRequestException('TEXT submissions must have non-empty textContent');
    }

    if (assignment.type === AssignmentType.FILE && effectiveFileAssetId == null) {
      throw new BadRequestException('FILE submissions must have a fileAssetId');
    }

    if (dto.fileAssetId !== undefined && dto.fileAssetId !== null) {
      const file = await this.fileRepo.findById(dto.fileAssetId);
      if (!file) throw new NotFoundException('File not found');
      // Verify file belongs to the submission's student (not the admin making the change)
      if (file.uploaderId !== submission.studentId) {
        throw new ForbiddenException('The file does not belong to the submission owner');
      }
    }

    return this.submissionRepo.update(submissionId, {
      textContent: effectiveTextContent,
      fileAssetId: effectiveFileAssetId,
      ...(isNowLate !== undefined && { isLate: isNowLate }),
    });
  }
}
