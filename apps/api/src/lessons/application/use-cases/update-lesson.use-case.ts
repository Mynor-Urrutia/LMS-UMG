import { ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IModuleRepository, MODULE_REPOSITORY } from '../../../course-modules/domain/ports/course-module-repository.port';
import { ILessonRepository, LESSON_REPOSITORY } from '../../domain/ports/lesson-repository.port';
import { LessonEntity } from '../../domain/entities/lesson.entity';
import { UpdateLessonDto } from '../dtos/update-lesson.dto';
import { UserRole } from '../../../common/enums/user-role.enum';
import { LessonType } from '../../../common/enums/lesson-type.enum';
import { sanitizeRichText } from '../../../common/utils/sanitize';

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

    if (lesson.isPublished) {
      if (lesson.type === LessonType.VIDEO && dto.videoUrl === null) {
        throw new UnprocessableEntityException('Cannot clear videoUrl on a published VIDEO lesson — unpublish first');
      }
      if (lesson.type === LessonType.TEXT && dto.content === null) {
        throw new UnprocessableEntityException('Cannot clear content on a published TEXT lesson — unpublish first');
      }
      if (lesson.type === LessonType.FILE || lesson.type === LessonType.INFOGRAPHIC) {
        if (dto.fileAssetId === null && dto.filePath === null) {
          throw new UnprocessableEntityException(`Cannot clear both fileAssetId and filePath on a published ${lesson.type} lesson — unpublish first`);
        }
      }
      if (lesson.type === LessonType.EMBED && dto.embedUrl === null) {
        throw new UnprocessableEntityException('Cannot clear embedUrl on a published EMBED lesson — unpublish first');
      }
      if (lesson.type === LessonType.CASE_STUDY && dto.content === null) {
        throw new UnprocessableEntityException('Cannot clear content on a published CASE_STUDY lesson — unpublish first');
      }
    }

    const hasChanges =
      dto.title !== undefined ||
      dto.content !== undefined ||
      dto.videoUrl !== undefined ||
      dto.fileAssetId !== undefined ||
      dto.filePath !== undefined ||
      dto.embedUrl !== undefined;
    if (!hasChanges) return lesson;

    const sanitizedContent =
      dto.content !== undefined
        ? dto.content === null
          ? null
          : (lesson.type === LessonType.TEXT || lesson.type === LessonType.CASE_STUDY)
            ? sanitizeRichText(dto.content)
            : dto.content
        : undefined;

    return this.lessonRepo.update(lessonId, {
      title: dto.title,
      content: sanitizedContent,
      videoUrl: dto.videoUrl,
      fileAssetId: dto.fileAssetId,
      filePath: dto.filePath,
      embedUrl: dto.embedUrl,
    });
  }
}
