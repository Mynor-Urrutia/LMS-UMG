import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../common/enums/user-role.enum';
import { GetStudentDashboardUseCase } from '../../application/use-cases/get-student-dashboard.use-case';
import { GetTeacherDashboardUseCase } from '../../application/use-cases/get-teacher-dashboard.use-case';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly getStudentDashboardUseCase: GetStudentDashboardUseCase,
    private readonly getTeacherDashboardUseCase: GetTeacherDashboardUseCase,
  ) {}

  @Get('student')
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get own student dashboard (enrolled courses, progress, XP, badges)' })
  getStudent(@CurrentUser() user: JwtPayload) {
    return this.getStudentDashboardUseCase.execute(user.sub);
  }

  @Get('teacher')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get teacher/admin dashboard (courses, student counts, pending grades)' })
  getTeacher(@CurrentUser() user: JwtPayload) {
    return this.getTeacherDashboardUseCase.execute(user.sub, user.role === UserRole.ADMIN);
  }
}
