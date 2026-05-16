import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IModuleRepository, MODULE_REPOSITORY } from '../../../course-modules/domain/ports/course-module-repository.port';
import { ILessonRepository, LESSON_REPOSITORY } from '../../domain/ports/lesson-repository.port';
import { LessonEntity } from '../../domain/entities/lesson.entity';
import { CreateLessonDto } from '../dtos/create-lesson.dto';
import { UserRole } from '../../../common/enums/user-role.enum';
import { LessonType } from '../../../common/enums/lesson-type.enum';

@Injectable()
export class CreateLessonUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(MODULE_REPOSITORY) private readonly moduleRepo: IModuleRepository,
    @Inject(LESSON_REPOSITORY) private readonly lessonRepo: ILessonRepository,
  ) {}

  async execute(
    courseId: string,
    moduleId: string,
    dto: CreateLessonDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<LessonEntity> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const isAdmin = requesterRole === UserRole.ADMIN;
    const isOwner = course.teacherId === requesterId;
    if (!isOwner && !isAdmin) throw new ForbiddenException('Only the course owner or an admin can add lessons');

    const mod = await this.moduleRepo.findById(moduleId);
    if (!mod || mod.courseId !== courseId) throw new NotFoundException('Module not found');

    const order = (await this.lessonRepo.maxOrder(moduleId)) + 1;
    return this.lessonRepo.create({
      moduleId,
      title: dto.title,
      type: dto.type ?? LessonType.TEXT,
      content: dto.content ?? null,
      videoUrl: dto.videoUrl ?? null,
      order,
    });
  }
}
