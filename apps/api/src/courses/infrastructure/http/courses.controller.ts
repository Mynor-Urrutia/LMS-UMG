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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { ParseSlugPipe } from '../../../common/pipes/parse-slug.pipe';
import { CreateCourseDto } from '../../application/dtos/create-course.dto';
import { UpdateCourseDto } from '../../application/dtos/update-course.dto';
import { ListCoursesDto } from '../../application/dtos/list-courses.dto';
import { CreateCourseUseCase } from '../../application/use-cases/create-course.use-case';
import { GetCourseUseCase } from '../../application/use-cases/get-course.use-case';
import { ListCoursesUseCase } from '../../application/use-cases/list-courses.use-case';
import { UpdateCourseUseCase } from '../../application/use-cases/update-course.use-case';
import { PublishCourseUseCase } from '../../application/use-cases/publish-course.use-case';
import { UnpublishCourseUseCase } from '../../application/use-cases/unpublish-course.use-case';
import { ArchiveCourseUseCase } from '../../application/use-cases/archive-course.use-case';
import { DeleteCourseUseCase } from '../../application/use-cases/delete-course.use-case';

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(
    private readonly createCourseUseCase: CreateCourseUseCase,
    private readonly getCourseUseCase: GetCourseUseCase,
    private readonly listCoursesUseCase: ListCoursesUseCase,
    private readonly updateCourseUseCase: UpdateCourseUseCase,
    private readonly publishCourseUseCase: PublishCourseUseCase,
    private readonly unpublishCourseUseCase: UnpublishCourseUseCase,
    private readonly archiveCourseUseCase: ArchiveCourseUseCase,
    private readonly deleteCourseUseCase: DeleteCourseUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new course and assign it to a teacher (admin only)' })
  create(@Body() dto: CreateCourseDto) {
    return this.createCourseUseCase.execute(dto);
  }

  @Get()
  @Public()
  @SkipThrottle({ auth: true })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List courses with filters' })
  listAll(@Query() dto: ListCoursesDto, @CurrentUser() user: JwtPayload | null) {
    return this.listCoursesUseCase.execute(dto, user?.sub ?? '', user?.role ?? UserRole.STUDENT);
  }

  // Static sub-routes declared before ':slug' to avoid NestJS treating them as slug params
  @Get(':slug')
  @Public()
  @SkipThrottle({ auth: true })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get course by slug' })
  getBySlug(@Param('slug', ParseSlugPipe) slug: string, @CurrentUser() user: JwtPayload | null) {
    return this.getCourseUseCase.execute(slug, user?.sub ?? '', user?.role ?? UserRole.STUDENT);
  }

  @Patch(':id/publish')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Publish a draft course (owner or admin)' })
  async publish(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    await this.publishCourseUseCase.execute(id, user.sub, user.role);
  }

  @Patch(':id/unpublish')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unpublish a course back to draft (owner or admin)' })
  async unpublish(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    await this.unpublishCourseUseCase.execute(id, user.sub, user.role);
  }

  @Patch(':id/archive')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a course permanently (owner or admin)' })
  async archive(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    await this.archiveCourseUseCase.execute(id, user.sub, user.role);
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update course metadata (owner or admin)' })
  update(
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.updateCourseUseCase.execute(id, dto, user.sub, user.role);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft course (owner or admin)' })
  async remove(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    await this.deleteCourseUseCase.execute(id, user.sub, user.role);
  }
}
