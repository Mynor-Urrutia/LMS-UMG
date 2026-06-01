import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { EnrollmentStatus } from '../../domain/entities/enrollment.entity';
import { EnrollUseCase } from '../../application/use-cases/enroll.use-case';
import { AdminEnrollUseCase } from '../../application/use-cases/admin-enroll.use-case';
import { GetMyEnrollmentsUseCase } from '../../application/use-cases/get-my-enrollments.use-case';
import { GetCourseEnrollmentsUseCase } from '../../application/use-cases/get-course-enrollments.use-case';
import { GetCourseStudentsProgressUseCase } from '../../application/use-cases/get-course-students-progress.use-case';
import { GetStudentCourseDetailUseCase, StudentCourseDetailDto } from '../../application/use-cases/get-student-course-detail.use-case';
import { ApproveEnrollmentUseCase } from '../../application/use-cases/approve-enrollment.use-case';
import { RejectEnrollmentUseCase } from '../../application/use-cases/reject-enrollment.use-case';

class AdminEnrollDto {
  @IsString()
  studentId!: string;
}

@ApiTags('enrollments')
@Controller()
export class EnrollmentsController {
  constructor(
    private readonly enrollUseCase: EnrollUseCase,
    private readonly adminEnrollUseCase: AdminEnrollUseCase,
    private readonly getMyEnrollmentsUseCase: GetMyEnrollmentsUseCase,
    private readonly getCourseEnrollmentsUseCase: GetCourseEnrollmentsUseCase,
    private readonly getCourseStudentsProgressUseCase: GetCourseStudentsProgressUseCase,
    private readonly getStudentCourseDetailUseCase: GetStudentCourseDetailUseCase,
    private readonly approveEnrollmentUseCase: ApproveEnrollmentUseCase,
    private readonly rejectEnrollmentUseCase: RejectEnrollmentUseCase,
  ) {}

  @Post('admin/courses/:courseId/enroll')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: force-enroll a student in a course (always ACTIVE, bypasses restrictions)' })
  adminEnroll(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Body() dto: AdminEnrollDto,
  ) {
    return this.adminEnrollUseCase.execute(courseId, dto.studentId);
  }

  @Post('courses/:courseId/enroll')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enroll in a course (OPEN → ACTIVE, APPROVAL → PENDING)' })
  enroll(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.enrollUseCase.execute(courseId, user.sub);
  }

  // 'enrollments' is a static segment — no conflict with :courseId routes above
  @Get('enrollments')
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List my enrollments' })
  getMyEnrollments(@CurrentUser() user: JwtPayload) {
    return this.getMyEnrollmentsUseCase.execute(user.sub);
  }

  @Get('courses/:courseId/enrollments')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List enrollments for a course (owner or admin). Filter by ?status=PENDING|ACTIVE|COMPLETED|REJECTED' })
  getCourseEnrollments(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Query('status', new ParseEnumPipe(EnrollmentStatus, { optional: true })) status: EnrollmentStatus | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getCourseEnrollmentsUseCase.execute(courseId, user.sub, user.role, status);
  }

  @Get('courses/:courseId/students/:studentId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get detailed info of one student in a course (owner or admin)' })
  getStudentCourseDetail(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('studentId', ParseCuidPipe) studentId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<StudentCourseDetailDto> {
    return this.getStudentCourseDetailUseCase.execute(courseId, studentId, user.sub, user.role as UserRole);
  }

  @Get('courses/:courseId/students-progress')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List enrolled students with lesson progress and grades (owner or admin)' })
  getCourseStudentsProgress(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getCourseStudentsProgressUseCase.execute(courseId, user.sub, user.role);
  }

  @Patch('enrollments/:enrollmentId/approve')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Approve a pending enrollment' })
  async approve(
    @Param('enrollmentId', ParseCuidPipe) enrollmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.approveEnrollmentUseCase.execute(enrollmentId, user.sub, user.role);
  }

  @Patch('enrollments/:enrollmentId/reject')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reject a pending enrollment' })
  async reject(
    @Param('enrollmentId', ParseCuidPipe) enrollmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.rejectEnrollmentUseCase.execute(enrollmentId, user.sub, user.role);
  }
}
