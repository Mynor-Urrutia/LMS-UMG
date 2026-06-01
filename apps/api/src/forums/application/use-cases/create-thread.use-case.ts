import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COURSE_REPOSITORY, ICourseRepository } from '../../../courses/domain/ports/course-repository.port';
import { ENROLLMENT_REPOSITORY, IEnrollmentRepository } from '../../../enrollments/domain/ports/enrollment-repository.port';
import { FORUM_REPOSITORY, IForumRepository } from '../../domain/ports/forum-repository.port';
import { ForumThreadEntity } from '../../domain/entities/forum-thread.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { EnrollmentStatus } from '../../../enrollments/domain/entities/enrollment.entity';
import { CreateThreadDto } from '../dtos/create-thread.dto';

@Injectable()
export class CreateThreadUseCase {
  constructor(
    @Inject(FORUM_REPOSITORY) private readonly forumRepo: IForumRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
  ) {}

  async execute(courseId: string, dto: CreateThreadDto, actorId: string, actorRole: UserRole): Promise<ForumThreadEntity> {
    if (actorRole === UserRole.STUDENT) {
      throw new ForbiddenException('Only teachers and admins can create forum threads');
    }

    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not teach this course');
    }

    return this.forumRepo.createThread({ courseId, authorId: actorId, title: dto.title });
  }
}
