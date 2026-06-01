import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { CreateAnnouncementDto } from '../../application/dtos/create-announcement.dto';
import { CreateAnnouncementUseCase } from '../../application/use-cases/create-announcement.use-case';
import { ListAnnouncementsUseCase } from '../../application/use-cases/list-announcements.use-case';
import { DeleteAnnouncementUseCase } from '../../application/use-cases/delete-announcement.use-case';

@ApiTags('course-announcements')
@Controller('courses/:courseId/announcements')
export class CourseAnnouncementsController {
  constructor(
    private readonly createUseCase: CreateAnnouncementUseCase,
    private readonly listUseCase: ListAnnouncementsUseCase,
    private readonly deleteUseCase: DeleteAnnouncementUseCase,
  ) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Post a course announcement (teacher or admin)' })
  create(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createUseCase.execute(courseId, dto, user.sub, user.role);
  }

  @Get()
  @Public()
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List announcements for a course (public)' })
  listAll(@Param('courseId', ParseCuidPipe) courseId: string) {
    return this.listUseCase.execute(courseId);
  }

  @Delete(':announcementId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a course announcement (teacher or admin)' })
  async remove(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('announcementId', ParseCuidPipe) announcementId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.deleteUseCase.execute(courseId, announcementId, user.sub, user.role);
  }
}
