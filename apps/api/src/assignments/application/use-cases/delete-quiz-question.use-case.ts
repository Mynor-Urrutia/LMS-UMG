import { ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/ports/assignment-repository.port';
import { AssignmentType } from '../../domain/entities/assignment.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class DeleteQuizQuestionUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
  ) {}

  async execute(courseId: string, assignmentId: string, questionId: string, actorId: string, actorRole: UserRole): Promise<void> {
    const [course, assignment, question] = await Promise.all([
      this.courseRepo.findById(courseId),
      this.assignmentRepo.findById(assignmentId),
      this.assignmentRepo.findQuestionById(questionId),
    ]);

    if (!course) throw new NotFoundException('Course not found');
    if (!assignment || assignment.courseId !== courseId) throw new NotFoundException('Assignment not found');
    if (!question || question.assignmentId !== assignmentId) throw new NotFoundException('Question not found');

    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not own this course');
    }

    if (assignment.type !== AssignmentType.QUIZ) {
      throw new UnprocessableEntityException('Cannot delete quiz questions from a non-QUIZ assignment');
    }

    await this.assignmentRepo.deleteQuestion(questionId);
  }
}
