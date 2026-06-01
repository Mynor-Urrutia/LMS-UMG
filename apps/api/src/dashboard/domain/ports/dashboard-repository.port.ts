import { StudentDashboard } from '../entities/student-dashboard.entity';
import { TeacherDashboard } from '../entities/teacher-dashboard.entity';

export const DASHBOARD_REPOSITORY = 'DASHBOARD_REPOSITORY';

export interface IDashboardRepository {
  getStudentDashboard(userId: string): Promise<StudentDashboard>;
  getTeacherDashboard(userId: string, isAdmin: boolean): Promise<TeacherDashboard>;
}
