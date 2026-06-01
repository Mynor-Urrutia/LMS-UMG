import { Inject, Injectable } from '@nestjs/common';
import { DASHBOARD_REPOSITORY, IDashboardRepository } from '../../domain/ports/dashboard-repository.port';
import { StudentDashboard } from '../../domain/entities/student-dashboard.entity';

@Injectable()
export class GetStudentDashboardUseCase {
  constructor(@Inject(DASHBOARD_REPOSITORY) private readonly dashboardRepo: IDashboardRepository) {}

  async execute(userId: string): Promise<StudentDashboard> {
    return this.dashboardRepo.getStudentDashboard(userId);
  }
}
