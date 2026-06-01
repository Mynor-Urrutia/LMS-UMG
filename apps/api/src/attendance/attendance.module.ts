import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CoursesModule } from '../courses/courses.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { ATTENDANCE_REPOSITORY } from './domain/ports/attendance-repository.port';
import { PrismaAttendanceAdapter } from './infrastructure/adapters/prisma-attendance.adapter';
import { AttendanceController } from './infrastructure/http/attendance.controller';
import { CreateSessionUseCase } from './application/use-cases/create-session.use-case';
import { ListSessionsUseCase } from './application/use-cases/list-sessions.use-case';
import { GetSessionUseCase } from './application/use-cases/get-session.use-case';
import { UpsertRecordUseCase } from './application/use-cases/upsert-record.use-case';
import { GetStudentAttendanceUseCase } from './application/use-cases/get-student-attendance.use-case';

@Module({
  imports: [PrismaModule, CoursesModule, EnrollmentsModule],
  controllers: [AttendanceController],
  providers: [
    { provide: ATTENDANCE_REPOSITORY, useClass: PrismaAttendanceAdapter },
    CreateSessionUseCase,
    ListSessionsUseCase,
    GetSessionUseCase,
    UpsertRecordUseCase,
    GetStudentAttendanceUseCase,
  ],
})
export class AttendanceModule {}
