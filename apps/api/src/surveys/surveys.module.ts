import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CoursesModule } from '../courses/courses.module';
import { SURVEY_REPOSITORY } from './domain/ports/survey-repository.port';
import { PrismaSurveyAdapter } from './infrastructure/adapters/prisma-survey.adapter';
import { CreateSurveyUseCase } from './application/use-cases/create-survey.use-case';
import { GetSurveyUseCase } from './application/use-cases/get-survey.use-case';
import { ListSurveysUseCase } from './application/use-cases/list-surveys.use-case';
import { DeleteSurveyUseCase } from './application/use-cases/delete-survey.use-case';
import { CloseSurveyUseCase } from './application/use-cases/close-survey.use-case';
import { SubmitSurveyResponseUseCase } from './application/use-cases/submit-survey-response.use-case';
import { GetSurveyResultsUseCase } from './application/use-cases/get-survey-results.use-case';
import { SurveysController } from './infrastructure/http/surveys.controller';

@Module({
  imports: [PrismaModule, CoursesModule],
  controllers: [SurveysController],
  providers: [
    { provide: SURVEY_REPOSITORY, useClass: PrismaSurveyAdapter },
    CreateSurveyUseCase,
    GetSurveyUseCase,
    ListSurveysUseCase,
    DeleteSurveyUseCase,
    CloseSurveyUseCase,
    SubmitSurveyResponseUseCase,
    GetSurveyResultsUseCase,
  ],
})
export class SurveysModule {}
