import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COURSE_REPOSITORY, ICourseRepository } from '../../../courses/domain/ports/course-repository.port';
import { ENROLLMENT_REPOSITORY, IEnrollmentRepository } from '../../../enrollments/domain/ports/enrollment-repository.port';
import { FORUM_REPOSITORY, IForumRepository, ForumThreadWithPosts } from '../../domain/ports/forum-repository.port';
import { UserRole } from '../../../common/enums/user-role.enum';
import { EnrollmentStatus } from '../../../enrollments/domain/entities/enrollment.entity';

@Injectable()
export class GetThreadUseCase {
  constructor(
    @Inject(FORUM_REPOSITORY) private readonly forumRepo: IForumRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
  ) {}

  async execute(courseId: string, threadId: string, actorId: string, actorRole: UserRole): Promise<ForumThreadWithPosts> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not teach this course');
    }
    if (actorRole === UserRole.STUDENT) {
      const enrollment = await this.enrollmentRepo.findByStudentAndCourse(actorId, courseId);
      if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
        throw new ForbiddenException('You must be actively enrolled in this course to view threads');
      }
    }

    const thread = await this.forumRepo.findThreadWithPosts(threadId);
    if (!thread || thread.courseId !== courseId) throw new NotFoundException('Thread not found');
    return thread;
  }
}
