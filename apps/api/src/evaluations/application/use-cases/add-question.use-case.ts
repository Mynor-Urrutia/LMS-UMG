import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COURSE_REPOSITORY, ICourseRepository } from '../../../courses/domain/ports/course-repository.port';
import { EVALUATION_REPOSITORY, IEvaluationRepository } from '../../domain/ports/evaluation-repository.port';
import { EvaluationQuestionEntity } from '../../domain/entities/evaluation.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { AddQuestionDto } from '../dtos/add-question.dto';

@Injectable()
export class AddQuestionUseCase {
  constructor(
    @Inject(EVALUATION_REPOSITORY) private readonly evalRepo: IEvaluationRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
  ) {}

  async execute(
    courseId: string,
    evaluationId: string,
    dto: AddQuestionDto,
    actorId: string,
    actorRole: UserRole,
  ): Promise<EvaluationQuestionEntity> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');
    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not teach this course');
    }
    const evaluation = await this.evalRepo.findById(evaluationId);
    if (!evaluation || evaluation.courseId !== courseId) throw new NotFoundException('Evaluation not found');

    if ((dto.type === 'MCQ' || dto.type === 'TRUE_FALSE') && (!dto.options || dto.options.length < 2)) {
      throw new BadRequestException('MCQ and TRUE_FALSE questions require at least 2 options');
    }

    return this.evalRepo.addQuestion({
      evaluationId,
      text: dto.text,
      type: dto.type,
      points: dto.points,
      options: dto.options,
    });
  }
}
