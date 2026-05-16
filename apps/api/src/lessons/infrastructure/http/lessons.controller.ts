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
import { CreateLessonDto } from '../../application/dtos/create-lesson.dto';
import { UpdateLessonDto } from '../../application/dtos/update-lesson.dto';
import { ReorderLessonsDto } from '../../application/dtos/reorder-lessons.dto';
import { CreateLessonUseCase } from '../../application/use-cases/create-lesson.use-case';
import { GetLessonUseCase } from '../../application/use-cases/get-lesson.use-case';
import { UpdateLessonUseCase } from '../../application/use-cases/update-lesson.use-case';
import { PublishLessonUseCase } from '../../application/use-cases/publish-lesson.use-case';
import { UnpublishLessonUseCase } from '../../application/use-cases/unpublish-lesson.use-case';
import { ReorderLessonsUseCase } from '../../application/use-cases/reorder-lessons.use-case';
import { DeleteLessonUseCase } from '../../application/use-cases/delete-lesson.use-case';

@ApiTags('lessons')
@Controller('courses/:courseId/modules/:moduleId/lessons')
export class LessonsController {
  constructor(
    private readonly createLessonUseCase: CreateLessonUseCase,
    private readonly getLessonUseCase: GetLessonUseCase,
    private readonly updateLessonUseCase: UpdateLessonUseCase,
    private readonly publishLessonUseCase: PublishLessonUseCase,
    private readonly unpublishLessonUseCase: UnpublishLessonUseCase,
    private readonly reorderLessonsUseCase: ReorderLessonsUseCase,
    private readonly deleteLessonUseCase: DeleteLessonUseCase,
  ) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a lesson to a module' })
  create(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('moduleId', ParseCuidPipe) moduleId: string,
    @Body() dto: CreateLessonDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createLessonUseCase.execute(courseId, moduleId, dto, user.sub, user.role);
  }

  @Get(':lessonId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get lesson content by ID' })
  getById(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('moduleId', ParseCuidPipe) moduleId: string,
    @Param('lessonId', ParseCuidPipe) lessonId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getLessonUseCase.execute(courseId, moduleId, lessonId, user.sub, user.role);
  }

  // Static 'reorder' declared before ':lessonId' sub-routes to avoid ambiguity
  @Patch('reorder')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder all lessons in a module (full list required)' })
  async reorder(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('moduleId', ParseCuidPipe) moduleId: string,
    @Body() dto: ReorderLessonsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.reorderLessonsUseCase.execute(courseId, moduleId, dto, user.sub, user.role);
  }

  @Patch(':lessonId/publish')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Publish a lesson (validates required content by type)' })
  async publish(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('moduleId', ParseCuidPipe) moduleId: string,
    @Param('lessonId', ParseCuidPipe) lessonId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.publishLessonUseCase.execute(courseId, moduleId, lessonId, user.sub, user.role);
  }

  @Patch(':lessonId/unpublish')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unpublish a lesson' })
  async unpublish(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('moduleId', ParseCuidPipe) moduleId: string,
    @Param('lessonId', ParseCuidPipe) lessonId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.unpublishLessonUseCase.execute(courseId, moduleId, lessonId, user.sub, user.role);
  }

  @Patch(':lessonId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update lesson fields (type is immutable after creation)' })
  update(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('moduleId', ParseCuidPipe) moduleId: string,
    @Param('lessonId', ParseCuidPipe) lessonId: string,
    @Body() dto: UpdateLessonDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.updateLessonUseCase.execute(courseId, moduleId, lessonId, dto, user.sub, user.role);
  }

  @Delete(':lessonId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a lesson' })
  async remove(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('moduleId', ParseCuidPipe) moduleId: string,
    @Param('lessonId', ParseCuidPipe) lessonId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.deleteLessonUseCase.execute(courseId, moduleId, lessonId, user.sub, user.role);
  }
}
