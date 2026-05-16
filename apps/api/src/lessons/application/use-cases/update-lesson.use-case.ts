import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IModuleRepository, MODULE_REPOSITORY } from '../../../course-modules/domain/ports/course-module-repository.port';
import { ILessonRepository, LESSON_REPOSITORY } from '../../domain/ports/lesson-repository.port';
import { LessonEntity } from '../../domain/entities/lesson.entity';
import { UpdateLessonDto } from '../dtos/update-lesson.dto';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class UpdateLessonUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(MODULE_REPOSITORY) private readonly moduleRepo: IModuleRepository,
    @Inject(LESSON_REPOSITORY) private readonly lessonRepo: ILessonRepository,
  ) {}

  async execute(
    courseId: string,
    moduleId: string,
    lessonId: string,
    dto: UpdateLessonDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<LessonEntity> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const isAdmin = requesterRole === UserRole.ADMIN;
    const isOwner = course.teacherId === requesterId;
    if (!isOwner && !isAdmin) throw new ForbiddenException('Only the course owner or an admin can update lessons');

    const mod = await this.moduleRepo.findById(moduleId);
    if (!mod || mod.courseId !== courseId) throw new NotFoundException('Module not found');

    const lesson = await this.lessonRepo.findById(lessonId);
    if (!lesson || lesson.moduleId !== moduleId) throw new NotFoundException('Lesson not found');

    const hasChanges = dto.title !== undefined || dto.content !== undefined || dto.videoUrl !== undefined;
    if (!hasChanges) return lesson;

    return this.lessonRepo.update(lessonId, {
      title: dto.title,
      content: dto.content,
      videoUrl: dto.videoUrl,
    });
  }
}
