import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COURSE_REPOSITORY, ICourseRepository } from '../../../courses/domain/ports/course-repository.port';
import { EVALUATION_REPOSITORY, IEvaluationRepository } from '../../domain/ports/evaluation-repository.port';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class DeleteQuestionUseCase {
  constructor(
    @Inject(EVALUATION_REPOSITORY) private readonly evalRepo: IEvaluationRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
  ) {}

  async execute(
    courseId: string,
    evaluationId: string,
    questionId: string,
    actorId: string,
    actorRole: UserRole,
  ): Promise<void> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');
    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not teach this course');
    }
    const evaluation = await this.evalRepo.findById(evaluationId);
    if (!evaluation || evaluation.courseId !== courseId) throw new NotFoundException('Evaluation not found');
    const question = evaluation.questions.find((q) => q.id === questionId);
    if (!question) throw new NotFoundException('Question not found');
    await this.evalRepo.deleteQuestion(questionId);
  }
}
