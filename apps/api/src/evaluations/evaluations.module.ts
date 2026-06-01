import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CoursesModule } from '../courses/courses.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { EVALUATION_REPOSITORY } from './domain/ports/evaluation-repository.port';
import { PrismaEvaluationsAdapter } from './infrastructure/adapters/prisma-evaluations.adapter';
import { EvaluationsController } from './infrastructure/http/evaluations.controller';
import { CreateEvaluationUseCase } from './application/use-cases/create-evaluation.use-case';
import { ListEvaluationsUseCase } from './application/use-cases/list-evaluations.use-case';
import { GetEvaluationUseCase } from './application/use-cases/get-evaluation.use-case';
import { AddQuestionUseCase } from './application/use-cases/add-question.use-case';
import { DeleteQuestionUseCase } from './application/use-cases/delete-question.use-case';
import { DeleteEvaluationUseCase } from './application/use-cases/delete-evaluation.use-case';
import { SubmitAttemptUseCase } from './application/use-cases/submit-attempt.use-case';
import { ListAttemptsUseCase } from './application/use-cases/list-attempts.use-case';
import { GradeAttemptUseCase } from './application/use-cases/grade-attempt.use-case';
import { UpdateEvaluationUseCase } from './application/use-cases/update-evaluation.use-case';
import { GetMyAttemptUseCase } from './application/use-cases/get-my-attempt.use-case';

@Module({
  imports: [PrismaModule, CoursesModule, EnrollmentsModule],
  controllers: [EvaluationsController],
  providers: [
    { provide: EVALUATION_REPOSITORY, useClass: PrismaEvaluationsAdapter },
    CreateEvaluationUseCase,
    ListEvaluationsUseCase,
    GetEvaluationUseCase,
    UpdateEvaluationUseCase,
    AddQuestionUseCase,
    DeleteQuestionUseCase,
    DeleteEvaluationUseCase,
    SubmitAttemptUseCase,
    ListAttemptsUseCase,
    GradeAttemptUseCase,
    GetMyAttemptUseCase,
  ],
  exports: [EVALUATION_REPOSITORY],
})
export class EvaluationsModule {}
