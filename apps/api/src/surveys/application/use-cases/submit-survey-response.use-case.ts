import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ISurveyRepository, SURVEY_REPOSITORY } from '../../domain/ports/survey-repository.port';
import { SubmitSurveyDto } from '../dtos/submit-survey.dto';

@Injectable()
export class SubmitSurveyResponseUseCase {
  constructor(@Inject(SURVEY_REPOSITORY) private readonly surveyRepo: ISurveyRepository) {}

  async execute(surveyId: string, dto: SubmitSurveyDto, userId: string): Promise<void> {
    const survey = await this.surveyRepo.findById(surveyId);
    if (!survey) throw new NotFoundException('Survey not found');
    if (!survey.isOpen) throw new BadRequestException('Survey is closed');

    if (!survey.isAnonymous) {
      const alreadyResponded = await this.surveyRepo.hasResponded(surveyId, userId);
      if (alreadyResponded) throw new ConflictException('You have already submitted a response to this survey');
    }

    const effectiveUserId = survey.isAnonymous ? null : userId;
    await this.surveyRepo.submitResponse(surveyId, effectiveUserId, dto.answers);
  }
}
