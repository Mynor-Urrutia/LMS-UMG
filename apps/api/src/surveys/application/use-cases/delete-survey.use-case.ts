import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ISurveyRepository, SURVEY_REPOSITORY } from '../../domain/ports/survey-repository.port';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class DeleteSurveyUseCase {
  constructor(@Inject(SURVEY_REPOSITORY) private readonly surveyRepo: ISurveyRepository) {}

  async execute(id: string, actorRole: UserRole): Promise<void> {
    const survey = await this.surveyRepo.findById(id);
    if (!survey) throw new NotFoundException('Survey not found');

    if (actorRole === UserRole.STUDENT) {
      throw new ForbiddenException('Students cannot delete surveys');
    }

    await this.surveyRepo.delete(id);
  }
}
