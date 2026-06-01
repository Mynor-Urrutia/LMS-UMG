import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ISurveyRepository, SURVEY_REPOSITORY } from '../../domain/ports/survey-repository.port';
import { SurveyResultItem } from '../../domain/entities/survey.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class GetSurveyResultsUseCase {
  constructor(@Inject(SURVEY_REPOSITORY) private readonly surveyRepo: ISurveyRepository) {}

  async execute(surveyId: string, actorRole: UserRole): Promise<SurveyResultItem[]> {
    if (actorRole === UserRole.STUDENT) {
      throw new ForbiddenException('Students cannot view aggregate survey results');
    }

    const survey = await this.surveyRepo.findById(surveyId);
    if (!survey) throw new NotFoundException('Survey not found');

    return this.surveyRepo.getResults(surveyId);
  }
}
