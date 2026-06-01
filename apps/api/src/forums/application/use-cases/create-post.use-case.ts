import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COURSE_REPOSITORY, ICourseRepository } from '../../../courses/domain/ports/course-repository.port';
import { ENROLLMENT_REPOSITORY, IEnrollmentRepository } from '../../../enrollments/domain/ports/enrollment-repository.port';
import { FORUM_REPOSITORY, IForumRepository } from '../../domain/ports/forum-repository.port';
import { ForumPostEntity } from '../../domain/entities/forum-post.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { EnrollmentStatus } from '../../../enrollments/domain/entities/enrollment.entity';
import { CreatePostDto } from '../dtos/create-post.dto';
import { sanitizeRichText } from '../../../common/utils/sanitize';

@Injectable()
export class CreatePostUseCase {
  constructor(
    @Inject(FORUM_REPOSITORY) private readonly forumRepo: IForumRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
  ) {}

  async execute(courseId: string, threadId: string, dto: CreatePostDto, actorId: string, actorRole: UserRole): Promise<ForumPostEntity> {
    const thread = await this.forumRepo.findThreadById(threadId);
    if (!thread || thread.courseId !== courseId) throw new NotFoundException('Thread not found');

    if (thread.isLocked && actorRole === UserRole.STUDENT) {
      throw new ForbiddenException('This thread is locked');
    }

    if (actorRole === UserRole.TEACHER) {
      const course = await this.courseRepo.findById(courseId);
      if (!course || course.teacherId !== actorId) throw new ForbiddenException('You do not teach this course');
    } else if (actorRole === UserRole.STUDENT) {
      const enrollment = await this.enrollmentRepo.findByStudentAndCourse(actorId, courseId);
      if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
        throw new ForbiddenException('You must be actively enrolled in this course to post');
      }
    }

    return this.forumRepo.createPost({ threadId, authorId: actorId, content: sanitizeRichText(dto.content), parentId: dto.parentId });
  }
}
