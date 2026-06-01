import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { ISurveyRepository, SURVEY_REPOSITORY } from '../../domain/ports/survey-repository.port';
import { SurveyEntity } from '../../domain/entities/survey.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { CreateSurveyDto } from '../dtos/create-survey.dto';

@Injectable()
export class CreateSurveyUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(SURVEY_REPOSITORY) private readonly surveyRepo: ISurveyRepository,
  ) {}

  async execute(courseId: string, dto: CreateSurveyDto, actorId: string, actorRole: UserRole): Promise<SurveyEntity> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not own this course');
    }

    return this.surveyRepo.create({
      courseId,
      title: dto.title,
      description: dto.description,
      isAnonymous: dto.isAnonymous ?? true,
      questions: dto.questions,
    });
  }
}
