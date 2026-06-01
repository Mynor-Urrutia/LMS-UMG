import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../../assignments/domain/ports/assignment-repository.port';
import { ISubmissionRepository, SUBMISSION_REPOSITORY } from '../../../submissions/domain/ports/submission-repository.port';
import { IGradeRepository, GRADE_REPOSITORY } from '../../domain/ports/grade-repository.port';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class DeleteGradeUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
    @Inject(SUBMISSION_REPOSITORY) private readonly submissionRepo: ISubmissionRepository,
    @Inject(GRADE_REPOSITORY) private readonly gradeRepo: IGradeRepository,
  ) {}

  async execute(
    courseId: string,
    assignmentId: string,
    submissionId: string,
    actorId: string,
    actorRole: UserRole,
  ): Promise<void> {
    if (actorRole === UserRole.STUDENT) throw new ForbiddenException('Students cannot delete grades');

    const [course, assignment, submission] = await Promise.all([
      this.courseRepo.findById(courseId),
      this.assignmentRepo.findById(assignmentId),
      this.submissionRepo.findById(submissionId),
    ]);

    if (!course) throw new NotFoundException('Course not found');
    if (!assignment || assignment.courseId !== courseId) throw new NotFoundException('Assignment not found');
    if (!submission || submission.assignmentId !== assignmentId) throw new NotFoundException('Submission not found');

    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not own this course');
    }

    const grade = await this.gradeRepo.findBySubmission(submissionId);
    if (!grade) throw new NotFoundException('Grade not found');

    await this.gradeRepo.delete(grade.id);
  }
}
