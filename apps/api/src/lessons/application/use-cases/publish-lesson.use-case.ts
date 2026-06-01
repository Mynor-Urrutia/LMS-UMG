import { ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IModuleRepository, MODULE_REPOSITORY } from '../../../course-modules/domain/ports/course-module-repository.port';
import { ILessonRepository, LESSON_REPOSITORY } from '../../domain/ports/lesson-repository.port';
import { UserRole } from '../../../common/enums/user-role.enum';
import { LessonType } from '../../../common/enums/lesson-type.enum';

@Injectable()
export class PublishLessonUseCase {
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
  ): Promise<void> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const isAdmin = requesterRole === UserRole.ADMIN;
    const isOwner = course.teacherId === requesterId;
    if (!isOwner && !isAdmin) throw new ForbiddenException('Only the course owner or an admin can publish lessons');

    const mod = await this.moduleRepo.findById(moduleId);
    if (!mod || mod.courseId !== courseId) throw new NotFoundException('Module not found');

    const lesson = await this.lessonRepo.findById(lessonId);
    if (!lesson || lesson.moduleId !== moduleId) throw new NotFoundException('Lesson not found');

    if (lesson.isPublished) throw new UnprocessableEntityException('Lesson is already published');

    if (lesson.type === LessonType.TEXT && !lesson.content) {
      throw new UnprocessableEntityException('TEXT lessons must have content before publishing');
    }
    if (lesson.type === LessonType.VIDEO && !lesson.videoUrl) {
      throw new UnprocessableEntityException('VIDEO lessons must have a video URL before publishing');
    }
    if (lesson.type === LessonType.FILE && !lesson.fileAssetId && !lesson.filePath) {
      throw new UnprocessableEntityException('FILE lessons require a fileAssetId or filePath before publishing');
    }
    if (lesson.type === LessonType.INFOGRAPHIC && !lesson.fileAssetId && !lesson.filePath) {
      throw new UnprocessableEntityException('INFOGRAPHIC lessons require a fileAssetId or filePath before publishing');
    }
    if (lesson.type === LessonType.EMBED && !lesson.embedUrl) {
      throw new UnprocessableEntityException('EMBED lessons must have an embedUrl before publishing');
    }
    if (lesson.type === LessonType.CASE_STUDY && !lesson.content) {
      throw new UnprocessableEntityException('CASE_STUDY lessons must have content before publishing');
    }
    if (
      lesson.type !== LessonType.TEXT &&
      lesson.type !== LessonType.VIDEO &&
      lesson.type !== LessonType.FILE &&
      lesson.type !== LessonType.EMBED &&
      lesson.type !== LessonType.INFOGRAPHIC &&
      lesson.type !== LessonType.CASE_STUDY
    ) {
      throw new UnprocessableEntityException('Unknown lesson type');
    }

    await this.lessonRepo.updatePublished(lessonId, true);
  }
}
