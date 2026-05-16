import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IModuleRepository, MODULE_REPOSITORY } from '../../domain/ports/course-module-repository.port';
import { CourseModuleEntity } from '../../domain/entities/course-module.entity';
import { UpdateModuleDto } from '../dtos/update-module.dto';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class UpdateCourseModuleUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(MODULE_REPOSITORY) private readonly moduleRepo: IModuleRepository,
  ) {}

  async execute(
    courseId: string,
    moduleId: string,
    dto: UpdateModuleDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<CourseModuleEntity> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const isAdmin = requesterRole === UserRole.ADMIN;
    const isOwner = course.teacherId === requesterId;
    if (!isOwner && !isAdmin) throw new ForbiddenException('Only the course owner or an admin can update modules');

    const mod = await this.moduleRepo.findById(moduleId);
    if (!mod || mod.courseId !== courseId) throw new NotFoundException('Module not found');

    return this.moduleRepo.update(moduleId, { title: dto.title });
  }
}
