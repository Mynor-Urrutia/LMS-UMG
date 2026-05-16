import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IModuleRepository, MODULE_REPOSITORY } from '../../domain/ports/course-module-repository.port';
import { ReorderModulesDto } from '../dtos/reorder-modules.dto';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class ReorderCourseModulesUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(MODULE_REPOSITORY) private readonly moduleRepo: IModuleRepository,
  ) {}

  async execute(
    courseId: string,
    dto: ReorderModulesDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<void> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const isAdmin = requesterRole === UserRole.ADMIN;
    const isOwner = course.teacherId === requesterId;
    if (!isOwner && !isAdmin) throw new ForbiddenException('Only the course owner or an admin can reorder modules');

    const modules = await this.moduleRepo.findByCourse(courseId);
    const existingIds = new Set(modules.map((m) => m.id));

    if (dto.ids.length !== existingIds.size || !dto.ids.every((id) => existingIds.has(id))) {
      throw new BadRequestException('ids must contain exactly all module IDs for this course');
    }

    await this.moduleRepo.reorder(courseId, dto.ids);
  }
}
