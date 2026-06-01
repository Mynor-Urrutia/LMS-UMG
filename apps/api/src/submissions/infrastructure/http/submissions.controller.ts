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
import { CreateSubmissionDto } from '../../application/dtos/create-submission.dto';
import { UpdateSubmissionDto } from '../../application/dtos/update-submission.dto';
import { CreateSubmissionUseCase } from '../../application/use-cases/create-submission.use-case';
import { GetSubmissionUseCase } from '../../application/use-cases/get-submission.use-case';
import { ListSubmissionsUseCase } from '../../application/use-cases/list-submissions.use-case';
import { UpdateSubmissionUseCase } from '../../application/use-cases/update-submission.use-case';
import { DeleteSubmissionUseCase } from '../../application/use-cases/delete-submission.use-case';

@ApiTags('submissions')
@Controller('courses/:courseId/assignments/:assignmentId/submissions')
export class SubmissionsController {
  constructor(
    private readonly createSubmissionUseCase: CreateSubmissionUseCase,
    private readonly getSubmissionUseCase: GetSubmissionUseCase,
    private readonly listSubmissionsUseCase: ListSubmissionsUseCase,
    private readonly updateSubmissionUseCase: UpdateSubmissionUseCase,
    private readonly deleteSubmissionUseCase: DeleteSubmissionUseCase,
  ) {}

  @Post()
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit an assignment (student only)' })
  create(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('assignmentId', ParseCuidPipe) assignmentId: string,
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createSubmissionUseCase.execute(courseId, assignmentId, dto, user.sub);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List submissions (student sees own; teacher/admin see all)' })
  list(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('assignmentId', ParseCuidPipe) assignmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listSubmissionsUseCase.execute(courseId, assignmentId, user.sub, user.role as UserRole);
  }

  @Get(':submissionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single submission' })
  getOne(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('assignmentId', ParseCuidPipe) assignmentId: string,
    @Param('submissionId', ParseCuidPipe) submissionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getSubmissionUseCase.execute(courseId, assignmentId, submissionId, user.sub, user.role as UserRole);
  }

  @Patch(':submissionId')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a submission (student updates own; admin can update any)' })
  update(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('assignmentId', ParseCuidPipe) assignmentId: string,
    @Param('submissionId', ParseCuidPipe) submissionId: string,
    @Body() dto: UpdateSubmissionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.updateSubmissionUseCase.execute(courseId, assignmentId, submissionId, dto, user.sub, user.role as UserRole);
  }

  @Delete(':submissionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a submission (student deletes own if ungraded; teacher/admin delete any)' })
  async remove(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('assignmentId', ParseCuidPipe) assignmentId: string,
    @Param('submissionId', ParseCuidPipe) submissionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.deleteSubmissionUseCase.execute(courseId, assignmentId, submissionId, user.sub, user.role as UserRole);
  }
}
