import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../../assignments/domain/ports/assignment-repository.port';
import { IEnrollmentRepository, ENROLLMENT_REPOSITORY } from '../../../enrollments/domain/ports/enrollment-repository.port';
import { EnrollmentStatus } from '../../../enrollments/domain/entities/enrollment.entity';
import { ISubmissionRepository, SUBMISSION_REPOSITORY } from '../../domain/ports/submission-repository.port';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class DeleteSubmissionUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
    @Inject(SUBMISSION_REPOSITORY) private readonly submissionRepo: ISubmissionRepository,
  ) {}

  async execute(courseId: string, assignmentId: string, submissionId: string, actorId: string, actorRole: UserRole): Promise<void> {
    const [course, assignment] = await Promise.all([
      this.courseRepo.findById(courseId),
      this.assignmentRepo.findById(assignmentId),
    ]);

    if (!course) throw new NotFoundException('Course not found');
    if (!assignment || assignment.courseId !== courseId) throw new NotFoundException('Assignment not found');

    const submission = await this.submissionRepo.findById(submissionId);
    if (!submission || submission.assignmentId !== assignmentId) throw new NotFoundException('Submission not found');

    if (actorRole === UserRole.STUDENT) {
      if (submission.studentId !== actorId) throw new NotFoundException('Submission not found');

      const [graded, enrollment] = await Promise.all([
        this.submissionRepo.hasGrade(submissionId),
        this.enrollmentRepo.findByStudentAndCourse(actorId, courseId),
      ]);

      if (graded) throw new ConflictException('Cannot delete a submission that has already been graded');
      if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
        throw new ForbiddenException('An active enrollment is required to delete your submission');
      }
    }

    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not own this course');
    }

    await this.submissionRepo.delete(submissionId);
  }
}
