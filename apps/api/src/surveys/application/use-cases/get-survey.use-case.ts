import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ISurveyRepository, SURVEY_REPOSITORY } from '../../domain/ports/survey-repository.port';
import { SurveyEntity, SurveyQuestionEntity } from '../../domain/entities/survey.entity';

@Injectable()
export class GetSurveyUseCase {
  constructor(@Inject(SURVEY_REPOSITORY) private readonly surveyRepo: ISurveyRepository) {}

  async execute(id: string): Promise<{ survey: SurveyEntity; questions: SurveyQuestionEntity[] }> {
    const survey = await this.surveyRepo.findById(id);
    if (!survey) throw new NotFoundException('Survey not found');
    const questions = await this.surveyRepo.findQuestions(id);
    return { survey, questions };
  }
}
