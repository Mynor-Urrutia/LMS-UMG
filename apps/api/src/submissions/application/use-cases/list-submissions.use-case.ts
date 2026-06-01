import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../../assignments/domain/ports/assignment-repository.port';
import { ISubmissionRepository, SUBMISSION_REPOSITORY, SubmissionWithStudentInfo } from '../../domain/ports/submission-repository.port';
import { SubmissionEntity } from '../../domain/entities/submission.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class ListSubmissionsUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
    @Inject(SUBMISSION_REPOSITORY) private readonly submissionRepo: ISubmissionRepository,
  ) {}

  async execute(courseId: string, assignmentId: string, actorId: string, actorRole: UserRole): Promise<SubmissionEntity[] | SubmissionWithStudentInfo[]> {
    const [course, assignment] = await Promise.all([
      this.courseRepo.findById(courseId),
      this.assignmentRepo.findById(assignmentId),
    ]);

    if (!course) throw new NotFoundException('Course not found');
    if (!assignment || assignment.courseId !== courseId) throw new NotFoundException('Assignment not found');

    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not own this course');
    }

    if (actorRole === UserRole.STUDENT) {
      const submission = await this.submissionRepo.findByStudentAndAssignment(actorId, assignmentId);
      return submission ? [submission] : [];
    }

    return this.submissionRepo.findByAssignmentWithStudents(assignmentId);
  }
}
