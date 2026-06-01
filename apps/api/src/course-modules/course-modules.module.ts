import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CoursesModule } from '../courses/courses.module';
import { MODULE_REPOSITORY } from './domain/ports/course-module-repository.port';
import { PrismaCourseModulesAdapter } from './infrastructure/adapters/prisma-course-modules.adapter';
import { CourseModulesController } from './infrastructure/http/course-modules.controller';
import { CreateCourseModuleUseCase } from './application/use-cases/create-course-module.use-case';
import { ListCourseModulesUseCase } from './application/use-cases/list-course-modules.use-case';
import { UpdateCourseModuleUseCase } from './application/use-cases/update-course-module.use-case';
import { ReorderCourseModulesUseCase } from './application/use-cases/reorder-course-modules.use-case';
import { DeleteCourseModuleUseCase } from './application/use-cases/delete-course-module.use-case';
import { GetModulePdfUseCase } from './application/use-cases/get-module-pdf.use-case';

@Module({
  imports: [PrismaModule, CoursesModule],
  controllers: [CourseModulesController],
  providers: [
    { provide: MODULE_REPOSITORY, useClass: PrismaCourseModulesAdapter },
    CreateCourseModuleUseCase,
    ListCourseModulesUseCase,
    UpdateCourseModuleUseCase,
    ReorderCourseModulesUseCase,
    DeleteCourseModuleUseCase,
    GetModulePdfUseCase,
  ],
  exports: [MODULE_REPOSITORY],
})
export class CourseModulesModule {}
