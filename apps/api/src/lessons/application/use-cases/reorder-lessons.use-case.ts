import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IModuleRepository, MODULE_REPOSITORY } from '../../../course-modules/domain/ports/course-module-repository.port';
import { ILessonRepository, LESSON_REPOSITORY } from '../../domain/ports/lesson-repository.port';
import { ReorderLessonsDto } from '../dtos/reorder-lessons.dto';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class ReorderLessonsUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(MODULE_REPOSITORY) private readonly moduleRepo: IModuleRepository,
    @Inject(LESSON_REPOSITORY) private readonly lessonRepo: ILessonRepository,
  ) {}

  async execute(
    courseId: string,
    moduleId: string,
    dto: ReorderLessonsDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<void> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const isAdmin = requesterRole === UserRole.ADMIN;
    const isOwner = course.teacherId === requesterId;
    if (!isOwner && !isAdmin) throw new ForbiddenException('Only the course owner or an admin can reorder lessons');

    const mod = await this.moduleRepo.findById(moduleId);
    if (!mod || mod.courseId !== courseId) throw new NotFoundException('Module not found');

    const lessons = await this.lessonRepo.findByModule(moduleId);
    const existingIds = new Set(lessons.map((l) => l.id));

    const uniqueSubmitted = new Set(dto.ids);
    if (uniqueSubmitted.size !== dto.ids.length) {
      throw new BadRequestException('Duplicate lesson IDs are not allowed in reorder');
    }

    if (dto.ids.length !== existingIds.size || !dto.ids.every((id) => existingIds.has(id))) {
      throw new BadRequestException('ids must contain exactly all lesson IDs for this module');
    }

    await this.lessonRepo.reorder(moduleId, dto.ids);
  }
}
