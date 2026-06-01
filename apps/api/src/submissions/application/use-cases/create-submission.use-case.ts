import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../../assignments/domain/ports/assignment-repository.port';
import { AssignmentType } from '../../../assignments/domain/entities/assignment.entity';
import { IEnrollmentRepository, ENROLLMENT_REPOSITORY } from '../../../enrollments/domain/ports/enrollment-repository.port';
import { EnrollmentStatus } from '../../../enrollments/domain/entities/enrollment.entity';
import { IFileRepository, FILE_REPOSITORY } from '../../../files/domain/ports/file-repository.port';
import { ISubmissionRepository, SUBMISSION_REPOSITORY } from '../../domain/ports/submission-repository.port';
import { SubmissionEntity } from '../../domain/entities/submission.entity';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';

@Injectable()
export class CreateSubmissionUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
    @Inject(FILE_REPOSITORY) private readonly fileRepo: IFileRepository,
    @Inject(SUBMISSION_REPOSITORY) private readonly submissionRepo: ISubmissionRepository,
  ) {}

  async execute(courseId: string, assignmentId: string, dto: CreateSubmissionDto, studentId: string): Promise<SubmissionEntity> {
    const [course, assignment] = await Promise.all([
      this.courseRepo.findById(courseId),
      this.assignmentRepo.findById(assignmentId),
    ]);

    if (!course) throw new NotFoundException('Course not found');
    if (!assignment || assignment.courseId !== courseId) throw new NotFoundException('Assignment not found');

    const enrollment = await this.enrollmentRepo.findByStudentAndCourse(studentId, courseId);
    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException('An active enrollment is required to submit');
    }

    const now = new Date();
    const isLate = assignment.dueDate !== null && now > assignment.dueDate;

    if (isLate && !assignment.allowLate) {
      throw new ForbiddenException('This assignment does not accept late submissions');
    }

    if (assignment.type === AssignmentType.TEXT && (dto.textContent == null || dto.textContent.trim() === '')) {
      throw new BadRequestException('textContent is required for TEXT assignments');
    }

    if (assignment.type === AssignmentType.FILE && !dto.fileAssetId) {
      throw new BadRequestException('fileAssetId is required for FILE assignments');
    }

    if (assignment.type === AssignmentType.DILEMMA && !dto.choiceId) {
      throw new BadRequestException('choiceId is required for DILEMMA assignments');
    }

    if (dto.fileAssetId) {
      const file = await this.fileRepo.findById(dto.fileAssetId);
      if (!file) throw new NotFoundException('File not found');
      if (file.uploaderId !== studentId) throw new ForbiddenException('You do not own this file');
    }

    if (dto.choiceId) {
      const choice = await this.assignmentRepo.findChoiceById(dto.choiceId);
      if (!choice) throw new NotFoundException('Dilemma choice not found');
    }

    return this.submissionRepo.create({
      studentId,
      assignmentId,
      textContent: assignment.type === AssignmentType.FILE || assignment.type === AssignmentType.DILEMMA ? null : (dto.textContent ?? null),
      fileAssetId: assignment.type === AssignmentType.TEXT || assignment.type === AssignmentType.DILEMMA ? null : (dto.fileAssetId ?? null),
      choiceId: assignment.type === AssignmentType.DILEMMA ? (dto.choiceId ?? null) : null,
      isLate,
    });
  }
}
