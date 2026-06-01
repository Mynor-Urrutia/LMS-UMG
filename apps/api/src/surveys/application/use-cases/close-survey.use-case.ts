import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ISurveyRepository, SURVEY_REPOSITORY } from '../../domain/ports/survey-repository.port';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class CloseSurveyUseCase {
  constructor(@Inject(SURVEY_REPOSITORY) private readonly surveyRepo: ISurveyRepository) {}

  async execute(id: string, actorRole: UserRole): Promise<void> {
    if (actorRole === UserRole.STUDENT) {
      throw new ForbiddenException('Students cannot close surveys');
    }
    const survey = await this.surveyRepo.findById(id);
    if (!survey) throw new NotFoundException('Survey not found');
    await this.surveyRepo.close(id);
  }
}
