import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { CreateSurveyDto } from '../../application/dtos/create-survey.dto';
import { SubmitSurveyDto } from '../../application/dtos/submit-survey.dto';
import { CreateSurveyUseCase } from '../../application/use-cases/create-survey.use-case';
import { GetSurveyUseCase } from '../../application/use-cases/get-survey.use-case';
import { ListSurveysUseCase } from '../../application/use-cases/list-surveys.use-case';
import { DeleteSurveyUseCase } from '../../application/use-cases/delete-survey.use-case';
import { CloseSurveyUseCase } from '../../application/use-cases/close-survey.use-case';
import { SubmitSurveyResponseUseCase } from '../../application/use-cases/submit-survey-response.use-case';
import { GetSurveyResultsUseCase } from '../../application/use-cases/get-survey-results.use-case';

@ApiTags('surveys')
@Controller('courses/:courseId/surveys')
export class SurveysController {
  constructor(
    private readonly createSurveyUseCase: CreateSurveyUseCase,
    private readonly getSurveyUseCase: GetSurveyUseCase,
    private readonly listSurveysUseCase: ListSurveysUseCase,
    private readonly deleteSurveyUseCase: DeleteSurveyUseCase,
    private readonly closeSurveyUseCase: CloseSurveyUseCase,
    private readonly submitSurveyResponseUseCase: SubmitSurveyResponseUseCase,
    private readonly getSurveyResultsUseCase: GetSurveyResultsUseCase,
  ) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a survey for a course (teacher or admin)' })
  create(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Body() dto: CreateSurveyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createSurveyUseCase.execute(courseId, dto, user.sub, user.role as UserRole);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List surveys for a course' })
  list(@Param('courseId', ParseCuidPipe) courseId: string) {
    return this.listSurveysUseCase.execute(courseId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a survey with its questions' })
  get(@Param('id', ParseCuidPipe) id: string) {
    return this.getSurveyUseCase.execute(id);
  }

  @Post(':id/responses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a response to a survey' })
  submit(
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: SubmitSurveyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.submitSurveyResponseUseCase.execute(id, dto, user.sub);
  }

  @Get(':id/results')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get aggregate results for a survey (teacher or admin)' })
  results(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getSurveyResultsUseCase.execute(id, user.role as UserRole);
  }

  @Patch(':id/close')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Close a survey (no more responses accepted)' })
  close(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.closeSurveyUseCase.execute(id, user.role as UserRole);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a survey' })
  delete(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.deleteSurveyUseCase.execute(id, user.role as UserRole);
  }
}
