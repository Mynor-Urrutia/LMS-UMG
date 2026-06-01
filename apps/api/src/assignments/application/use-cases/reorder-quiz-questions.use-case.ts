import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/ports/assignment-repository.port';
import { AssignmentType } from '../../domain/entities/assignment.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ReorderQuizQuestionsDto } from '../dtos/reorder-quiz-questions.dto';

@Injectable()
export class ReorderQuizQuestionsUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
  ) {}

  async execute(courseId: string, assignmentId: string, dto: ReorderQuizQuestionsDto, actorId: string, actorRole: UserRole): Promise<void> {
    const [course, assignment, existing] = await Promise.all([
      this.courseRepo.findById(courseId),
      this.assignmentRepo.findById(assignmentId),
      this.assignmentRepo.findQuestionsByAssignment(assignmentId),
    ]);

    if (!course) throw new NotFoundException('Course not found');
    if (!assignment || assignment.courseId !== courseId) throw new NotFoundException('Assignment not found');

    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not own this course');
    }

    if (assignment.type !== AssignmentType.QUIZ) {
      throw new UnprocessableEntityException('Cannot reorder questions on a non-QUIZ assignment');
    }

    if (new Set(dto.orderedIds).size !== dto.orderedIds.length) {
      throw new BadRequestException('orderedIds contains duplicate IDs');
    }

    const existingIds = new Set(existing.map((q) => q.id));
    for (const id of dto.orderedIds) {
      if (!existingIds.has(id)) throw new BadRequestException(`Question ${id} does not belong to this assignment`);
    }
    if (dto.orderedIds.length !== existing.length) {
      throw new BadRequestException('orderedIds must contain exactly all question IDs for this assignment');
    }

    await this.assignmentRepo.reorderQuestions(assignmentId, dto.orderedIds);
  }
}
