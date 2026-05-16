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
import { CreateModuleDto } from '../../application/dtos/create-module.dto';
import { UpdateModuleDto } from '../../application/dtos/update-module.dto';
import { ReorderModulesDto } from '../../application/dtos/reorder-modules.dto';
import { CreateCourseModuleUseCase } from '../../application/use-cases/create-course-module.use-case';
import { ListCourseModulesUseCase } from '../../application/use-cases/list-course-modules.use-case';
import { UpdateCourseModuleUseCase } from '../../application/use-cases/update-course-module.use-case';
import { ReorderCourseModulesUseCase } from '../../application/use-cases/reorder-course-modules.use-case';
import { DeleteCourseModuleUseCase } from '../../application/use-cases/delete-course-module.use-case';

@ApiTags('course-modules')
@Controller('courses/:courseId/modules')
export class CourseModulesController {
  constructor(
    private readonly createModuleUseCase: CreateCourseModuleUseCase,
    private readonly listModulesUseCase: ListCourseModulesUseCase,
    private readonly updateModuleUseCase: UpdateCourseModuleUseCase,
    private readonly reorderModulesUseCase: ReorderCourseModulesUseCase,
    private readonly deleteModuleUseCase: DeleteCourseModuleUseCase,
  ) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a module to a course' })
  create(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Body() dto: CreateModuleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createModuleUseCase.execute(courseId, dto, user.sub, user.role);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List course modules with lesson summaries' })
  listAll(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listModulesUseCase.execute(courseId, user.sub, user.role);
  }

  // Static 'reorder' segment must be declared before ':moduleId' to avoid being matched as a CUID param
  @Patch('reorder')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder all modules for a course (full list required)' })
  async reorder(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Body() dto: ReorderModulesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.reorderModulesUseCase.execute(courseId, dto, user.sub, user.role);
  }

  @Patch(':moduleId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update module title' })
  update(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('moduleId', ParseCuidPipe) moduleId: string,
    @Body() dto: UpdateModuleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.updateModuleUseCase.execute(courseId, moduleId, dto, user.sub, user.role);
  }

  @Delete(':moduleId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a module and all its lessons' })
  async remove(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('moduleId', ParseCuidPipe) moduleId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.deleteModuleUseCase.execute(courseId, moduleId, user.sub, user.role);
  }
}
