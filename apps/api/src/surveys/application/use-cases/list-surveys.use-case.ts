import { Inject, Injectable } from '@nestjs/common';
import { ISurveyRepository, SURVEY_REPOSITORY } from '../../domain/ports/survey-repository.port';
import { SurveyEntity } from '../../domain/entities/survey.entity';

@Injectable()
export class ListSurveysUseCase {
  constructor(@Inject(SURVEY_REPOSITORY) private readonly surveyRepo: ISurveyRepository) {}

  async execute(courseId: string): Promise<SurveyEntity[]> {
    return this.surveyRepo.findByCourse(courseId);
  }
}
