import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CoursesModule } from '../courses/courses.module';
import { CourseModulesModule } from '../course-modules/course-modules.module';
import { LESSON_REPOSITORY } from './domain/ports/lesson-repository.port';
import { PrismaLessonsAdapter } from './infrastructure/adapters/prisma-lessons.adapter';
import { LessonsController } from './infrastructure/http/lessons.controller';
import { CreateLessonUseCase } from './application/use-cases/create-lesson.use-case';
import { GetLessonUseCase } from './application/use-cases/get-lesson.use-case';
import { UpdateLessonUseCase } from './application/use-cases/update-lesson.use-case';
import { PublishLessonUseCase } from './application/use-cases/publish-lesson.use-case';
import { UnpublishLessonUseCase } from './application/use-cases/unpublish-lesson.use-case';
import { ReorderLessonsUseCase } from './application/use-cases/reorder-lessons.use-case';
import { DeleteLessonUseCase } from './application/use-cases/delete-lesson.use-case';
import { ListLessonsUseCase } from './application/use-cases/list-lessons.use-case';

@Module({
  imports: [PrismaModule, CoursesModule, CourseModulesModule],
  controllers: [LessonsController],
  providers: [
    { provide: LESSON_REPOSITORY, useClass: PrismaLessonsAdapter },
    CreateLessonUseCase,
    GetLessonUseCase,
    UpdateLessonUseCase,
    PublishLessonUseCase,
    UnpublishLessonUseCase,
    ReorderLessonsUseCase,
    DeleteLessonUseCase,
    ListLessonsUseCase,
  ],
  exports: [LESSON_REPOSITORY],
})
export class LessonsModule {}
