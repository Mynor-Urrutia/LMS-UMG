import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { SmartThrottleGuard } from './common/guards/smart-throttle.guard';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { validationSchema } from './config/validation.schema';
import { PrismaModule } from './common/prisma/prisma.module';
import { CommonModule } from './common/modules/common.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { CoursesModule } from './courses/courses.module';
import { CourseModulesModule } from './course-modules/course-modules.module';
import { LessonsModule } from './lessons/lessons.module';
import { FilesModule } from './files/files.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { GradingModule } from './grading/grading.module';
import { GamificationModule } from './gamification/gamification.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ForumsModule } from './forums/forums.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CalendarModule } from './calendar/calendar.module';
import { CustomRolesModule } from './custom-roles/custom-roles.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { AttendanceModule } from './attendance/attendance.module';
import { CourseAnnouncementsModule } from './course-announcements/course-announcements.module';
import { AcademicStructureModule } from './academic-structure/academic-structure.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { EmailModule } from './email/email.module';
import { CourseReviewsModule } from './course-reviews/course-reviews.module';
import { CertificatesModule } from './certificates/certificates.module';
import { SurveysModule } from './surveys/surveys.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validationSchema,
      validationOptions: { abortEarly: false },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'global',
          ttl: config.get<number>('THROTTLE_TTL_SECONDS', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
        {
          name: 'auth',
          ttl: 60_000,
          limit: 5,
        },
      ],
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    CoursesModule,
    CourseModulesModule,
    LessonsModule,
    FilesModule,
    EnrollmentsModule,
    AssignmentsModule,
    SubmissionsModule,
    GradingModule,
    GamificationModule,
    NotificationsModule,
    ForumsModule,
    DashboardModule,
    CalendarModule,
    CustomRolesModule,
    EvaluationsModule,
    AttendanceModule,
    CourseAnnouncementsModule,
    AcademicStructureModule,
    AuditLogModule,
    EmailModule,
    CourseReviewsModule,
    CertificatesModule,
    SurveysModule,
  ],
  providers: [
    // Filters — NestJS applies APP_FILTER in LIFO order (last registered = first to run).
    // PrismaExceptionFilter registered last → runs first, claims Prisma errors.
    // AllExceptionsFilter registered first → runs as fallback for everything else.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
    { provide: APP_GUARD, useClass: SmartThrottleGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
