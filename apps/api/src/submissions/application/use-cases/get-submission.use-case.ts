import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../../assignments/domain/ports/assignment-repository.port';
import { ISubmissionRepository, SUBMISSION_REPOSITORY } from '../../domain/ports/submission-repository.port';
import { SubmissionEntity } from '../../domain/entities/submission.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class GetSubmissionUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
    @Inject(SUBMISSION_REPOSITORY) private readonly submissionRepo: ISubmissionRepository,
  ) {}

  async execute(courseId: string, assignmentId: string, submissionId: string, actorId: string, actorRole: UserRole): Promise<SubmissionEntity> {
    const [course, assignment] = await Promise.all([
      this.courseRepo.findById(courseId),
      this.assignmentRepo.findById(assignmentId),
    ]);

    if (!course) throw new NotFoundException('Course not found');
    if (!assignment || assignment.courseId !== courseId) throw new NotFoundException('Assignment not found');

    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not own this course');
    }

    const submission = await this.submissionRepo.findById(submissionId);
    if (!submission || submission.assignmentId !== assignmentId) throw new NotFoundException('Submission not found');

    if (actorRole === UserRole.STUDENT && submission.studentId !== actorId) {
      throw new NotFoundException('Submission not found');
    }

    return submission;
  }
}
