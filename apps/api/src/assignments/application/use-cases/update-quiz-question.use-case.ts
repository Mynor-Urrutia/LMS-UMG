import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/ports/assignment-repository.port';
import { QuizQuestionEntity, AssignmentType } from '../../domain/entities/assignment.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UpdateQuizQuestionDto } from '../dtos/update-quiz-question.dto';

@Injectable()
export class UpdateQuizQuestionUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
  ) {}

  async execute(courseId: string, assignmentId: string, questionId: string, dto: UpdateQuizQuestionDto, actorId: string, actorRole: UserRole): Promise<QuizQuestionEntity> {
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
      throw new UnprocessableEntityException('Cannot update quiz questions on a non-QUIZ assignment');
    }

    // Changing options without explicitly specifying correctOption is rejected: the old index
    // may now point to a different option text, silently corrupting the answer key.
    if (dto.options !== undefined && dto.correctOption === undefined) {
      throw new BadRequestException('correctOption is required when updating options');
    }

    const effectiveOptions = dto.options ?? question.options;
    const effectiveCorrectOption = dto.correctOption ?? question.correctOption;
    if (effectiveCorrectOption >= effectiveOptions.length) {
      throw new BadRequestException(`correctOption (${effectiveCorrectOption}) must be less than options.length (${effectiveOptions.length})`);
    }

    return this.assignmentRepo.updateQuestion(questionId, {
      question: dto.question,
      options: dto.options,
      correctOption: dto.correctOption !== undefined ? effectiveCorrectOption : undefined,
    });
  }
}
