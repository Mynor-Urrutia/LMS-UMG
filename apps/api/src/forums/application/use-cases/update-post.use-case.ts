import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ENROLLMENT_REPOSITORY, IEnrollmentRepository } from '../../../enrollments/domain/ports/enrollment-repository.port';
import { EnrollmentStatus } from '../../../enrollments/domain/entities/enrollment.entity';
import { FORUM_REPOSITORY, IForumRepository } from '../../domain/ports/forum-repository.port';
import { ForumPostEntity } from '../../domain/entities/forum-post.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UpdatePostDto } from '../dtos/update-post.dto';
import { sanitizeRichText } from '../../../common/utils/sanitize';

@Injectable()
export class UpdatePostUseCase {
  constructor(
    @Inject(FORUM_REPOSITORY) private readonly forumRepo: IForumRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
  ) {}

  async execute(postId: string, dto: UpdatePostDto, actorId: string, actorRole: UserRole): Promise<ForumPostEntity> {
    const post = await this.forumRepo.findPostById(postId);
    if (!post || post.deletedAt) throw new NotFoundException('Post not found');
    if (post.authorId !== actorId) throw new ForbiddenException('You can only edit your own posts');

    if (actorRole === UserRole.STUDENT) {
      const thread = await this.forumRepo.findThreadById(post.threadId);
      if (!thread) throw new NotFoundException('Thread not found');
      if (thread.isLocked) throw new ForbiddenException('Thread is locked');
      const enrollment = await this.enrollmentRepo.findByStudentAndCourse(actorId, thread.courseId);
      if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
        throw new ForbiddenException('You must be actively enrolled to edit posts');
      }
    }

    return this.forumRepo.updatePost(postId, sanitizeRichText(dto.content));
  }
}
