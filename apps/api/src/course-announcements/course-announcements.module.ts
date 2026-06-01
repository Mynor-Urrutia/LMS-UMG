import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CoursesModule } from '../courses/courses.module';
import { ANNOUNCEMENT_REPOSITORY } from './domain/ports/course-announcement-repository.port';
import { PrismaAnnouncementsAdapter } from './infrastructure/adapters/prisma-announcements.adapter';
import { CreateAnnouncementUseCase } from './application/use-cases/create-announcement.use-case';
import { ListAnnouncementsUseCase } from './application/use-cases/list-announcements.use-case';
import { DeleteAnnouncementUseCase } from './application/use-cases/delete-announcement.use-case';
import { CourseAnnouncementsController } from './infrastructure/http/course-announcements.controller';

@Module({
  imports: [PrismaModule, CoursesModule],
  controllers: [CourseAnnouncementsController],
  providers: [
    { provide: ANNOUNCEMENT_REPOSITORY, useClass: PrismaAnnouncementsAdapter },
    CreateAnnouncementUseCase,
    ListAnnouncementsUseCase,
    DeleteAnnouncementUseCase,
  ],
})
export class CourseAnnouncementsModule {}
