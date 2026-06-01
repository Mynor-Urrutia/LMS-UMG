import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { CompleteLessonUseCase } from '../../application/use-cases/complete-lesson.use-case';
import { GetCourseProgressUseCase } from '../../application/use-cases/get-course-progress.use-case';

@ApiTags('lesson-progress')
@Controller('courses/:courseId')
export class LessonProgressController {
  constructor(
    private readonly completeLessonUseCase: CompleteLessonUseCase,
    private readonly getCourseProgressUseCase: GetCourseProgressUseCase,
  ) {}

  @Post('modules/:moduleId/lessons/:lessonId/complete')
  @Roles(UserRole.STUDENT)
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a lesson as complete and get updated course progress' })
  complete(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('moduleId', ParseCuidPipe) moduleId: string,
    @Param('lessonId', ParseCuidPipe) lessonId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.completeLessonUseCase.execute(courseId, moduleId, lessonId, user.sub);
  }

  @Get('progress')
  @Roles(UserRole.STUDENT)
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get my progress for a course' })
  getProgress(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getCourseProgressUseCase.execute(courseId, user.sub);
  }
}
