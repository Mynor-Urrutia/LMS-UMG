import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COURSE_REPOSITORY, ICourseRepository } from '../../../courses/domain/ports/course-repository.port';
import { FORUM_REPOSITORY, IForumRepository } from '../../domain/ports/forum-repository.port';
import { ForumThreadEntity } from '../../domain/entities/forum-thread.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class PinThreadUseCase {
  constructor(
    @Inject(FORUM_REPOSITORY) private readonly forumRepo: IForumRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
  ) {}

  async execute(courseId: string, threadId: string, isPinned: boolean, actorId: string, actorRole: UserRole): Promise<ForumThreadEntity> {
    if (actorRole !== UserRole.TEACHER && actorRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only teachers and admins can pin threads');
    }
    if (actorRole === UserRole.TEACHER) {
      const course = await this.courseRepo.findById(courseId);
      if (!course || course.teacherId !== actorId) throw new ForbiddenException('You do not teach this course');
    }

    const thread = await this.forumRepo.findThreadById(threadId);
    if (!thread || thread.courseId !== courseId) throw new NotFoundException('Thread not found');

    return this.forumRepo.updateThread(threadId, { isPinned });
  }
}
