import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COURSE_REPOSITORY, ICourseRepository } from '../../../courses/domain/ports/course-repository.port';
import { ENROLLMENT_REPOSITORY, IEnrollmentRepository } from '../../../enrollments/domain/ports/enrollment-repository.port';
import { EnrollmentStatus } from '../../../enrollments/domain/entities/enrollment.entity';
import { FORUM_REPOSITORY, IForumRepository } from '../../domain/ports/forum-repository.port';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class DeletePostUseCase {
  constructor(
    @Inject(FORUM_REPOSITORY) private readonly forumRepo: IForumRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
  ) {}

  async execute(postId: string, actorId: string, actorRole: UserRole): Promise<void> {
    const post = await this.forumRepo.findPostById(postId);
    if (!post || post.deletedAt) throw new NotFoundException('Post not found');

    if (actorRole === UserRole.ADMIN) {
      // admin can soft-delete any post
    } else if (actorRole === UserRole.TEACHER) {
      const thread = await this.forumRepo.findThreadById(post.threadId);
      if (!thread) throw new NotFoundException('Thread not found');
      const course = await this.courseRepo.findById(thread.courseId);
      if (!course || course.teacherId !== actorId) throw new ForbiddenException('You do not teach this course');
    } else {
      if (post.authorId !== actorId) throw new ForbiddenException('You can only delete your own posts');
      const thread = await this.forumRepo.findThreadById(post.threadId);
      if (!thread) throw new NotFoundException('Thread not found');
      const enrollment = await this.enrollmentRepo.findByStudentAndCourse(actorId, thread.courseId);
      if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
        throw new ForbiddenException('You must be actively enrolled to delete posts');
      }
    }

    await this.forumRepo.softDeletePost(postId);
  }
}
