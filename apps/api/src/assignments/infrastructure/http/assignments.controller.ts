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
import { CreateAssignmentDto } from '../../application/dtos/create-assignment.dto';
import { UpdateAssignmentDto } from '../../application/dtos/update-assignment.dto';
import { CreateQuizQuestionDto } from '../../application/dtos/create-quiz-question.dto';
import { UpdateQuizQuestionDto } from '../../application/dtos/update-quiz-question.dto';
import { ReorderQuizQuestionsDto } from '../../application/dtos/reorder-quiz-questions.dto';
import { CreateAssignmentUseCase } from '../../application/use-cases/create-assignment.use-case';
import { GetAssignmentUseCase } from '../../application/use-cases/get-assignment.use-case';
import { ListAssignmentsUseCase } from '../../application/use-cases/list-assignments.use-case';
import { UpdateAssignmentUseCase } from '../../application/use-cases/update-assignment.use-case';
import { DeleteAssignmentUseCase } from '../../application/use-cases/delete-assignment.use-case';
import { AddQuizQuestionUseCase } from '../../application/use-cases/add-quiz-question.use-case';
import { ListQuizQuestionsUseCase } from '../../application/use-cases/list-quiz-questions.use-case';
import { UpdateQuizQuestionUseCase } from '../../application/use-cases/update-quiz-question.use-case';
import { DeleteQuizQuestionUseCase } from '../../application/use-cases/delete-quiz-question.use-case';
import { ReorderQuizQuestionsUseCase } from '../../application/use-cases/reorder-quiz-questions.use-case';
import { CreateDilemmaUseCase } from '../../application/use-cases/create-dilemma.use-case';
import { GetDilemmaUseCase } from '../../application/use-cases/get-dilemma.use-case';
import { CreateDilemmaDto } from '../../application/dtos/create-dilemma.dto';

@ApiTags('assignments')
@Controller('courses/:courseId/assignments')
export class AssignmentsController {
  constructor(
    private readonly createAssignmentUseCase: CreateAssignmentUseCase,
    private readonly getAssignmentUseCase: GetAssignmentUseCase,
    private readonly listAssignmentsUseCase: ListAssignmentsUseCase,
    private readonly updateAssignmentUseCase: UpdateAssignmentUseCase,
    private readonly deleteAssignmentUseCase: DeleteAssignmentUseCase,
    private readonly addQuizQuestionUseCase: AddQuizQuestionUseCase,
    private readonly listQuizQuestionsUseCase: ListQuizQuestionsUseCase,
    private readonly updateQuizQuestionUseCase: UpdateQuizQuestionUseCase,
    private readonly deleteQuizQuestionUseCase: DeleteQuizQuestionUseCase,
    private readonly reorderQuizQuestionsUseCase: ReorderQuizQuestionsUseCase,
    private readonly createDilemmaUseCase: CreateDilemmaUseCase,
    private readonly getDilemmaUseCase: GetDilemmaUseCase,
  ) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an assignment for a course (teacher or admin)' })
  create(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createAssignmentUseCase.execute(courseId, dto, user.sub, user.role as UserRole);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List assignments for a course' })
  list(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listAssignmentsUseCase.execute(courseId, user.sub, user.role as UserRole);
  }

  @Get(':assignmentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single assignment' })
  getOne(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('assignmentId', ParseCuidPipe) assignmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getAssignmentUseCase.execute(courseId, assignmentId, user.sub, user.role as UserRole);
  }

  @Patch(':assignmentId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an assignment (teacher or admin)' })
  update(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('assignmentId', ParseCuidPipe) assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.updateAssignmentUseCase.execute(courseId, assignmentId, dto, user.sub, user.role as UserRole);
  }

  @Delete(':assignmentId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an assignment (teacher or admin)' })
  async remove(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('assignmentId', ParseCuidPipe) assignmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.deleteAssignmentUseCase.execute(courseId, assignmentId, user.sub, user.role as UserRole);
  }

  // ── Quiz questions ─────────────────────────────────────────────────────────

  @Post(':assignmentId/questions')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a quiz question (teacher or admin)' })
  addQuestion(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('assignmentId', ParseCuidPipe) assignmentId: string,
    @Body() dto: CreateQuizQuestionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.addQuizQuestionUseCase.execute(courseId, assignmentId, dto, user.sub, user.role as UserRole);
  }

  @Get(':assignmentId/questions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List quiz questions for an assignment' })
  listQuestions(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('assignmentId', ParseCuidPipe) assignmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listQuizQuestionsUseCase.execute(courseId, assignmentId, user.sub, user.role as UserRole);
  }

  // Static sub-route declared before ':questionId' to avoid NestJS routing conflict
  @Patch(':assignmentId/questions/reorder')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder quiz questions (teacher or admin)' })
  async reorderQuestions(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('assignmentId', ParseCuidPipe) assignmentId: string,
    @Body() dto: ReorderQuizQuestionsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.reorderQuizQuestionsUseCase.execute(courseId, assignmentId, dto, user.sub, user.role as UserRole);
  }

  @Patch(':assignmentId/questions/:questionId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a quiz question (teacher or admin)' })
  updateQuestion(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('assignmentId', ParseCuidPipe) assignmentId: string,
    @Param('questionId', ParseCuidPipe) questionId: string,
    @Body() dto: UpdateQuizQuestionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.updateQuizQuestionUseCase.execute(courseId, assignmentId, questionId, dto, user.sub, user.role as UserRole);
  }

  @Delete(':assignmentId/questions/:questionId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a quiz question (teacher or admin)' })
  async removeQuestion(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('assignmentId', ParseCuidPipe) assignmentId: string,
    @Param('questionId', ParseCuidPipe) questionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.deleteQuizQuestionUseCase.execute(courseId, assignmentId, questionId, user.sub, user.role as UserRole);
  }

  // ── Ethical Dilemma ────────────────────────────────────────────────────────

  @Post(':assignmentId/dilemma')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an ethical dilemma scenario for a DILEMMA-type assignment' })
  createDilemma(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('assignmentId', ParseCuidPipe) assignmentId: string,
    @Body() dto: CreateDilemmaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createDilemmaUseCase.execute(courseId, assignmentId, dto, user.sub, user.role as UserRole);
  }

  @Get(':assignmentId/dilemma')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the ethical dilemma scenario for an assignment' })
  getDilemma(@Param('assignmentId', ParseCuidPipe) assignmentId: string) {
    return this.getDilemmaUseCase.execute(assignmentId);
  }
}
