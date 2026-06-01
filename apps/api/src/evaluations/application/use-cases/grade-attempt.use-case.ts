import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COURSE_REPOSITORY, ICourseRepository } from '../../../courses/domain/ports/course-repository.port';
import { EVALUATION_REPOSITORY, IEvaluationRepository } from '../../domain/ports/evaluation-repository.port';
import { StudentAttemptEntity } from '../../domain/entities/evaluation.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { GradeAttemptDto } from '../dtos/grade-attempt.dto';

@Injectable()
export class GradeAttemptUseCase {
  constructor(
    @Inject(EVALUATION_REPOSITORY) private readonly evalRepo: IEvaluationRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
  ) {}

  async execute(
    courseId: string,
    evaluationId: string,
    attemptId: string,
    dto: GradeAttemptDto,
    actorId: string,
    actorRole: UserRole,
  ): Promise<StudentAttemptEntity> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');
    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not teach this course');
    }
    const evaluation = await this.evalRepo.findById(evaluationId);
    if (!evaluation || evaluation.courseId !== courseId) throw new NotFoundException('Evaluation not found');
    return this.evalRepo.gradeAttempt(attemptId, dto.score, dto.feedback ?? null);
  }
}
