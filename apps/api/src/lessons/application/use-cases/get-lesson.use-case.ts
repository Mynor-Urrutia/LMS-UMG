import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IModuleRepository, MODULE_REPOSITORY } from '../../../course-modules/domain/ports/course-module-repository.port';
import { ILessonRepository, LESSON_REPOSITORY } from '../../domain/ports/lesson-repository.port';
import { LessonEntity } from '../../domain/entities/lesson.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { CourseStatus } from '../../../common/enums/course-status.enum';

@Injectable()
export class GetLessonUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(MODULE_REPOSITORY) private readonly moduleRepo: IModuleRepository,
    @Inject(LESSON_REPOSITORY) private readonly lessonRepo: ILessonRepository,
  ) {}

  async execute(
    courseId: string,
    moduleId: string,
    lessonId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<LessonEntity> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const isAdmin = requesterRole === UserRole.ADMIN;
    const isOwner = course.teacherId === requesterId;

    if (course.status !== CourseStatus.PUBLISHED && !isOwner && !isAdmin) {
      throw new NotFoundException('Course not found');
    }

    const mod = await this.moduleRepo.findById(moduleId);
    if (!mod || mod.courseId !== courseId) throw new NotFoundException('Module not found');

    const lesson = await this.lessonRepo.findById(lessonId);
    if (!lesson || lesson.moduleId !== moduleId) throw new NotFoundException('Lesson not found');

    if (!lesson.isPublished && !isOwner && !isAdmin) {
      throw new NotFoundException('Lesson not found');
    }

    return lesson;
  }
}
