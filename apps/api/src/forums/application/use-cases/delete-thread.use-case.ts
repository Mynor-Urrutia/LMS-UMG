import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COURSE_REPOSITORY, ICourseRepository } from '../../../courses/domain/ports/course-repository.port';
import { FORUM_REPOSITORY, IForumRepository } from '../../domain/ports/forum-repository.port';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class DeleteThreadUseCase {
  constructor(
    @Inject(FORUM_REPOSITORY) private readonly forumRepo: IForumRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
  ) {}

  async execute(courseId: string, threadId: string, actorId: string, actorRole: UserRole): Promise<void> {
    const thread = await this.forumRepo.findThreadById(threadId);
    if (!thread || thread.courseId !== courseId) throw new NotFoundException('Thread not found');

    if (actorRole === UserRole.ADMIN) {
      // admin can delete any thread
    } else if (actorRole === UserRole.TEACHER) {
      const course = await this.courseRepo.findById(courseId);
      if (!course || course.teacherId !== actorId) throw new ForbiddenException('You do not teach this course');
    } else {
      if (thread.authorId !== actorId) throw new ForbiddenException('You can only delete your own threads');
      if (thread.isLocked) throw new ForbiddenException('Thread is locked');
    }

    await this.forumRepo.deleteThread(threadId);
  }
}
