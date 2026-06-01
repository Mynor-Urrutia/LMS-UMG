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
import { CreateEvaluationDto } from '../../application/dtos/create-evaluation.dto';
import { AddQuestionDto } from '../../application/dtos/add-question.dto';
import { SubmitAttemptDto } from '../../application/dtos/submit-attempt.dto';
import { GradeAttemptDto } from '../../application/dtos/grade-attempt.dto';
import { UpdateEvaluationDto } from '../../application/dtos/update-evaluation.dto';
import { CreateEvaluationUseCase } from '../../application/use-cases/create-evaluation.use-case';
import { ListEvaluationsUseCase } from '../../application/use-cases/list-evaluations.use-case';
import { GetEvaluationUseCase } from '../../application/use-cases/get-evaluation.use-case';
import { DeleteEvaluationUseCase } from '../../application/use-cases/delete-evaluation.use-case';
import { AddQuestionUseCase } from '../../application/use-cases/add-question.use-case';
import { DeleteQuestionUseCase } from '../../application/use-cases/delete-question.use-case';
import { SubmitAttemptUseCase } from '../../application/use-cases/submit-attempt.use-case';
import { ListAttemptsUseCase } from '../../application/use-cases/list-attempts.use-case';
import { GradeAttemptUseCase } from '../../application/use-cases/grade-attempt.use-case';
import { UpdateEvaluationUseCase } from '../../application/use-cases/update-evaluation.use-case';
import { GetMyAttemptUseCase } from '../../application/use-cases/get-my-attempt.use-case';

@ApiTags('evaluations')
@Controller('courses/:courseId/evaluations')
export class EvaluationsController {
  constructor(
    private readonly createEvaluationUseCase: CreateEvaluationUseCase,
    private readonly listEvaluationsUseCase: ListEvaluationsUseCase,
    private readonly getEvaluationUseCase: GetEvaluationUseCase,
    private readonly updateEvaluationUseCase: UpdateEvaluationUseCase,
    private readonly deleteEvaluationUseCase: DeleteEvaluationUseCase,
    private readonly addQuestionUseCase: AddQuestionUseCase,
    private readonly deleteQuestionUseCase: DeleteQuestionUseCase,
    private readonly submitAttemptUseCase: SubmitAttemptUseCase,
    private readonly listAttemptsUseCase: ListAttemptsUseCase,
    private readonly gradeAttemptUseCase: GradeAttemptUseCase,
    private readonly getMyAttemptUseCase: GetMyAttemptUseCase,
  ) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an evaluation (teacher or admin)' })
  create(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Body() dto: CreateEvaluationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createEvaluationUseCase.execute(courseId, dto, user.sub, user.role as UserRole);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List evaluations for a course' })
  list(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listEvaluationsUseCase.execute(courseId, user.sub, user.role as UserRole);
  }

  @Get(':evaluationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get an evaluation with questions' })
  getOne(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('evaluationId', ParseCuidPipe) evaluationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getEvaluationUseCase.execute(courseId, evaluationId, user.sub, user.role as UserRole);
  }

  @Patch(':evaluationId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an evaluation (teacher or admin)' })
  update(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('evaluationId', ParseCuidPipe) evaluationId: string,
    @Body() dto: UpdateEvaluationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.updateEvaluationUseCase.execute(courseId, evaluationId, dto, user.sub, user.role as UserRole);
  }

  @Delete(':evaluationId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an evaluation (teacher or admin)' })
  async remove(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('evaluationId', ParseCuidPipe) evaluationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.deleteEvaluationUseCase.execute(courseId, evaluationId, user.sub, user.role as UserRole);
  }

  @Post(':evaluationId/questions')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a question to an evaluation (teacher or admin)' })
  addQuestion(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('evaluationId', ParseCuidPipe) evaluationId: string,
    @Body() dto: AddQuestionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.addQuestionUseCase.execute(courseId, evaluationId, dto, user.sub, user.role as UserRole);
  }

  @Delete(':evaluationId/questions/:questionId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a question (teacher or admin)' })
  async removeQuestion(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('evaluationId', ParseCuidPipe) evaluationId: string,
    @Param('questionId', ParseCuidPipe) questionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.deleteQuestionUseCase.execute(courseId, evaluationId, questionId, user.sub, user.role as UserRole);
  }

  @Post(':evaluationId/attempt')
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit an attempt (student only)' })
  submitAttempt(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('evaluationId', ParseCuidPipe) evaluationId: string,
    @Body() dto: SubmitAttemptDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.submitAttemptUseCase.execute(courseId, evaluationId, dto, user.sub);
  }

  @Get(':evaluationId/my-attempt')
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get my attempt result for an evaluation (student)' })
  getMyAttempt(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('evaluationId', ParseCuidPipe) evaluationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getMyAttemptUseCase.execute(courseId, evaluationId, user.sub);
  }

  @Get(':evaluationId/attempts')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all attempts for an evaluation (teacher or admin)' })
  listAttempts(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('evaluationId', ParseCuidPipe) evaluationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listAttemptsUseCase.execute(courseId, evaluationId, user.sub, user.role as UserRole);
  }

  @Patch(':evaluationId/attempts/:attemptId/grade')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Grade an attempt (teacher or admin)' })
  gradeAttempt(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('evaluationId', ParseCuidPipe) evaluationId: string,
    @Param('attemptId', ParseCuidPipe) attemptId: string,
    @Body() dto: GradeAttemptDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.gradeAttemptUseCase.execute(courseId, evaluationId, attemptId, dto, user.sub, user.role as UserRole);
  }
}
