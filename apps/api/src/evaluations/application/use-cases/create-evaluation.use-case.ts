import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COURSE_REPOSITORY, ICourseRepository } from '../../../courses/domain/ports/course-repository.port';
import { EVALUATION_REPOSITORY, IEvaluationRepository } from '../../domain/ports/evaluation-repository.port';
import { EvaluationEntity } from '../../domain/entities/evaluation.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { CreateEvaluationDto } from '../dtos/create-evaluation.dto';

@Injectable()
export class CreateEvaluationUseCase {
  constructor(
    @Inject(EVALUATION_REPOSITORY) private readonly evalRepo: IEvaluationRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
  ) {}

  async execute(
    courseId: string,
    dto: CreateEvaluationDto,
    actorId: string,
    actorRole: UserRole,
  ): Promise<EvaluationEntity> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');
    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not teach this course');
    }
    return this.evalRepo.create({
      courseId,
      title: dto.title,
      description: dto.description ?? null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      totalPoints: dto.totalPoints ?? 100,
    });
  }
}
