import {
  Body,
  Controller,
  Delete,
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
import { CreateGradeDto } from '../../application/dtos/create-grade.dto';
import { UpdateGradeDto } from '../../application/dtos/update-grade.dto';
import { CreateGradeUseCase } from '../../application/use-cases/create-grade.use-case';
import { GetGradeUseCase } from '../../application/use-cases/get-grade.use-case';
import { UpdateGradeUseCase } from '../../application/use-cases/update-grade.use-case';
import { DeleteGradeUseCase } from '../../application/use-cases/delete-grade.use-case';

@ApiTags('grading')
@Controller('courses/:courseId/assignments/:assignmentId/submissions/:submissionId/grade')
export class GradingController {
  constructor(
    private readonly createGradeUseCase: CreateGradeUseCase,
    private readonly getGradeUseCase: GetGradeUseCase,
    private readonly updateGradeUseCase: UpdateGradeUseCase,
    private readonly deleteGradeUseCase: DeleteGradeUseCase,
  ) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Grade a submission (teacher/admin only)' })
  create(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('assignmentId', ParseCuidPipe) assignmentId: string,
    @Param('submissionId', ParseCuidPipe) submissionId: string,
    @Body() dto: CreateGradeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createGradeUseCase.execute(courseId, assignmentId, submissionId, dto, user.sub, user.role as UserRole);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get grade for a submission (student sees own; teacher/admin see any)' })
  getOne(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('assignmentId', ParseCuidPipe) assignmentId: string,
    @Param('submissionId', ParseCuidPipe) submissionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getGradeUseCase.execute(courseId, assignmentId, submissionId, user.sub, user.role as UserRole);
  }

  @Patch()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a grade (teacher/admin only)' })
  update(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('assignmentId', ParseCuidPipe) assignmentId: string,
    @Param('submissionId', ParseCuidPipe) submissionId: string,
    @Body() dto: UpdateGradeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.updateGradeUseCase.execute(courseId, assignmentId, submissionId, dto, user.sub, user.role as UserRole);
  }

  @Delete()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a grade (teacher/admin only)' })
  async remove(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('assignmentId', ParseCuidPipe) assignmentId: string,
    @Param('submissionId', ParseCuidPipe) submissionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.deleteGradeUseCase.execute(courseId, assignmentId, submissionId, user.sub, user.role as UserRole);
  }
}
