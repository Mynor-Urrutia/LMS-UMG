import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { CreateSessionDto } from '../../application/dtos/create-session.dto';
import { UpsertRecordDto } from '../../application/dtos/upsert-record.dto';
import { CreateSessionUseCase } from '../../application/use-cases/create-session.use-case';
import { ListSessionsUseCase } from '../../application/use-cases/list-sessions.use-case';
import { GetSessionUseCase } from '../../application/use-cases/get-session.use-case';
import { UpsertRecordUseCase } from '../../application/use-cases/upsert-record.use-case';
import { GetStudentAttendanceUseCase } from '../../application/use-cases/get-student-attendance.use-case';

@ApiTags('attendance')
@Controller('courses/:courseId/attendance')
export class AttendanceController {
  constructor(
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly listSessionsUseCase: ListSessionsUseCase,
    private readonly getSessionUseCase: GetSessionUseCase,
    private readonly upsertRecordUseCase: UpsertRecordUseCase,
    private readonly getStudentAttendanceUseCase: GetStudentAttendanceUseCase,
  ) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an attendance session (teacher or admin)' })
  create(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Body() dto: CreateSessionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createSessionUseCase.execute(courseId, dto, user.sub, user.role as UserRole);
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List attendance sessions (teacher or admin)' })
  list(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listSessionsUseCase.execute(courseId, user.sub, user.role as UserRole);
  }

  @Get('my-attendance')
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get my attendance for a course (student)' })
  myAttendance(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getStudentAttendanceUseCase.execute(courseId, user.sub);
  }

  @Get(':sessionId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a session with attendance records (teacher or admin)' })
  getOne(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('sessionId', ParseCuidPipe) sessionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getSessionUseCase.execute(courseId, sessionId, user.sub, user.role as UserRole);
  }

  @Patch(':sessionId/records')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert an attendance record (teacher or admin)' })
  upsertRecord(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('sessionId', ParseCuidPipe) sessionId: string,
    @Body() dto: UpsertRecordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.upsertRecordUseCase.execute(courseId, sessionId, dto, user.sub, user.role as UserRole);
  }
}
