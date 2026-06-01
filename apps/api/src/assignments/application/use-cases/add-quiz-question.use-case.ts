import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/ports/assignment-repository.port';
import { QuizQuestionEntity, AssignmentType } from '../../domain/entities/assignment.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { CreateQuizQuestionDto } from '../dtos/create-quiz-question.dto';

@Injectable()
export class AddQuizQuestionUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
  ) {}

  async execute(courseId: string, assignmentId: string, dto: CreateQuizQuestionDto, actorId: string, actorRole: UserRole): Promise<QuizQuestionEntity> {
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
      throw new UnprocessableEntityException('Quiz questions can only be added to QUIZ-type assignments');
    }

    if (dto.correctOption >= dto.options.length) {
      throw new BadRequestException(`correctOption (${dto.correctOption}) must be less than options.length (${dto.options.length})`);
    }

    return this.assignmentRepo.addQuestion({
      assignmentId,
      question: dto.question,
      options: dto.options,
      correctOption: dto.correctOption,
    });
  }
}
