import { ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IEnrollmentRepository, ENROLLMENT_REPOSITORY } from '../../../enrollments/domain/ports/enrollment-repository.port';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/ports/assignment-repository.port';
import { QuizQuestionEntity, QuizQuestionPublicEntity, AssignmentType } from '../../domain/entities/assignment.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { EnrollmentStatus } from '../../../enrollments/domain/entities/enrollment.entity';

@Injectable()
export class ListQuizQuestionsUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
  ) {}

  async execute(
    courseId: string,
    assignmentId: string,
    actorId: string,
    actorRole: UserRole,
  ): Promise<QuizQuestionEntity[] | QuizQuestionPublicEntity[]> {
    const [course, assignment] = await Promise.all([
      this.courseRepo.findById(courseId),
      this.assignmentRepo.findById(assignmentId),
    ]);

    if (!course) throw new NotFoundException('Course not found');
    if (!assignment || assignment.courseId !== courseId) throw new NotFoundException('Assignment not found');

    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not own this course');
    }

    if (assignment.type !== AssignmentType.QUIZ) {
      throw new UnprocessableEntityException('This assignment does not have quiz questions');
    }

    if (actorRole === UserRole.STUDENT) {
      const enrollment = await this.enrollmentRepo.findByStudentAndCourse(actorId, courseId);
      if (!enrollment || (enrollment.status !== EnrollmentStatus.ACTIVE && enrollment.status !== EnrollmentStatus.COMPLETED)) {
        throw new ForbiddenException('An active enrollment is required to view quiz questions');
      }
      const questions = await this.assignmentRepo.findQuestionsByAssignment(assignmentId);
      return questions.map(({ correctOption: _co, ...rest }) => rest);
    }

    return this.assignmentRepo.findQuestionsByAssignment(assignmentId);
  }
}
