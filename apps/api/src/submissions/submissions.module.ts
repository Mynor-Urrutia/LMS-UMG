import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CoursesModule } from '../courses/courses.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { FilesModule } from '../files/files.module';
import { SUBMISSION_REPOSITORY } from './domain/ports/submission-repository.port';
import { PrismaSubmissionsAdapter } from './infrastructure/adapters/prisma-submissions.adapter';
import { CreateSubmissionUseCase } from './application/use-cases/create-submission.use-case';
import { GetSubmissionUseCase } from './application/use-cases/get-submission.use-case';
import { ListSubmissionsUseCase } from './application/use-cases/list-submissions.use-case';
import { UpdateSubmissionUseCase } from './application/use-cases/update-submission.use-case';
import { DeleteSubmissionUseCase } from './application/use-cases/delete-submission.use-case';
import { SubmissionsController } from './infrastructure/http/submissions.controller';

@Module({
  imports: [PrismaModule, CoursesModule, EnrollmentsModule, AssignmentsModule, FilesModule],
  controllers: [SubmissionsController],
  providers: [
    { provide: SUBMISSION_REPOSITORY, useClass: PrismaSubmissionsAdapter },
    CreateSubmissionUseCase,
    GetSubmissionUseCase,
    ListSubmissionsUseCase,
    UpdateSubmissionUseCase,
    DeleteSubmissionUseCase,
  ],
  exports: [SUBMISSION_REPOSITORY],
})
export class SubmissionsModule {}
