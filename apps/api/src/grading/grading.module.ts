import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CoursesModule } from '../courses/courses.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { GRADE_REPOSITORY } from './domain/ports/grade-repository.port';
import { PrismaGradingAdapter } from './infrastructure/adapters/prisma-grading.adapter';
import { CreateGradeUseCase } from './application/use-cases/create-grade.use-case';
import { GetGradeUseCase } from './application/use-cases/get-grade.use-case';
import { UpdateGradeUseCase } from './application/use-cases/update-grade.use-case';
import { DeleteGradeUseCase } from './application/use-cases/delete-grade.use-case';
import { GradingController } from './infrastructure/http/grading.controller';
import { GradeExportController } from './infrastructure/http/grade-export.controller';
import { GradeExportService } from './application/services/grade-export.service';

@Module({
  imports: [PrismaModule, CoursesModule, AssignmentsModule, SubmissionsModule],
  controllers: [GradingController, GradeExportController],
  providers: [
    { provide: GRADE_REPOSITORY, useClass: PrismaGradingAdapter },
    CreateGradeUseCase,
    GetGradeUseCase,
    UpdateGradeUseCase,
    DeleteGradeUseCase,
    GradeExportService,
  ],
  exports: [],
})
export class GradingModule {}
