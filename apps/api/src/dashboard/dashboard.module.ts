import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { DASHBOARD_REPOSITORY } from './domain/ports/dashboard-repository.port';
import { PrismaDashboardAdapter } from './infrastructure/adapters/prisma-dashboard.adapter';
import { GetStudentDashboardUseCase } from './application/use-cases/get-student-dashboard.use-case';
import { GetTeacherDashboardUseCase } from './application/use-cases/get-teacher-dashboard.use-case';
import { DashboardController } from './infrastructure/http/dashboard.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController],
  providers: [
    { provide: DASHBOARD_REPOSITORY, useClass: PrismaDashboardAdapter },
    GetStudentDashboardUseCase,
    GetTeacherDashboardUseCase,
  ],
})
export class DashboardModule {}
