import { Inject, Injectable } from '@nestjs/common';
import { DASHBOARD_REPOSITORY, IDashboardRepository } from '../../domain/ports/dashboard-repository.port';
import { TeacherDashboard } from '../../domain/entities/teacher-dashboard.entity';

@Injectable()
export class GetTeacherDashboardUseCase {
  constructor(@Inject(DASHBOARD_REPOSITORY) private readonly dashboardRepo: IDashboardRepository) {}

  async execute(userId: string, isAdmin = false): Promise<TeacherDashboard> {
    return this.dashboardRepo.getTeacherDashboard(userId, isAdmin);
  }
}
