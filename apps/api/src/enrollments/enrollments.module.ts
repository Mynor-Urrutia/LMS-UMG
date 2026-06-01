import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CoursesModule } from '../courses/courses.module';
import { CourseModulesModule } from '../course-modules/course-modules.module';
import { LessonsModule } from '../lessons/lessons.module';
import { ENROLLMENT_REPOSITORY } from './domain/ports/enrollment-repository.port';
import { LESSON_PROGRESS_REPOSITORY } from './domain/ports/lesson-progress-repository.port';
import { PrismaEnrollmentsAdapter } from './infrastructure/adapters/prisma-enrollments.adapter';
import { PrismaLessonProgressAdapter } from './infrastructure/adapters/prisma-lesson-progress.adapter';
import { EnrollmentsController } from './infrastructure/http/enrollments.controller';
import { LessonProgressController } from './infrastructure/http/lesson-progress.controller';
import { EnrollUseCase } from './application/use-cases/enroll.use-case';
import { AdminEnrollUseCase } from './application/use-cases/admin-enroll.use-case';
import { GetMyEnrollmentsUseCase } from './application/use-cases/get-my-enrollments.use-case';
import { GetCourseEnrollmentsUseCase } from './application/use-cases/get-course-enrollments.use-case';
import { GetCourseStudentsProgressUseCase } from './application/use-cases/get-course-students-progress.use-case';
import { GetStudentCourseDetailUseCase } from './application/use-cases/get-student-course-detail.use-case';
import { ApproveEnrollmentUseCase } from './application/use-cases/approve-enrollment.use-case';
import { RejectEnrollmentUseCase } from './application/use-cases/reject-enrollment.use-case';
import { CompleteLessonUseCase } from './application/use-cases/complete-lesson.use-case';
import { GetCourseProgressUseCase } from './application/use-cases/get-course-progress.use-case';

@Module({
  imports: [PrismaModule, CoursesModule, CourseModulesModule, LessonsModule],
  controllers: [EnrollmentsController, LessonProgressController],
  providers: [
    { provide: ENROLLMENT_REPOSITORY, useClass: PrismaEnrollmentsAdapter },
    { provide: LESSON_PROGRESS_REPOSITORY, useClass: PrismaLessonProgressAdapter },
    EnrollUseCase,
    AdminEnrollUseCase,
    GetMyEnrollmentsUseCase,
    GetCourseEnrollmentsUseCase,
    GetCourseStudentsProgressUseCase,
    GetStudentCourseDetailUseCase,
    ApproveEnrollmentUseCase,
    RejectEnrollmentUseCase,
    CompleteLessonUseCase,
    GetCourseProgressUseCase,
  ],
  exports: [ENROLLMENT_REPOSITORY],
})
export class EnrollmentsModule {}
