import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { COURSE_REPOSITORY } from './domain/ports/course-repository.port';
import { PrismaCoursesAdapter } from './infrastructure/adapters/prisma-courses.adapter';
import { CreateCourseUseCase } from './application/use-cases/create-course.use-case';
import { GetCourseUseCase } from './application/use-cases/get-course.use-case';
import { ListCoursesUseCase } from './application/use-cases/list-courses.use-case';
import { UpdateCourseUseCase } from './application/use-cases/update-course.use-case';
import { PublishCourseUseCase } from './application/use-cases/publish-course.use-case';
import { UnpublishCourseUseCase } from './application/use-cases/unpublish-course.use-case';
import { ArchiveCourseUseCase } from './application/use-cases/archive-course.use-case';
import { DeleteCourseUseCase } from './application/use-cases/delete-course.use-case';
import { CoursesController } from './infrastructure/http/courses.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CoursesController],
  providers: [
    { provide: COURSE_REPOSITORY, useClass: PrismaCoursesAdapter },
    CreateCourseUseCase,
    GetCourseUseCase,
    ListCoursesUseCase,
    UpdateCourseUseCase,
    PublishCourseUseCase,
    UnpublishCourseUseCase,
    ArchiveCourseUseCase,
    DeleteCourseUseCase,
  ],
  exports: [COURSE_REPOSITORY],
})
export class CoursesModule {}
