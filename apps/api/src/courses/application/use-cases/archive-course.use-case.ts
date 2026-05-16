import { ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../domain/ports/course-repository.port';
import { CourseStatus } from '../../domain/entities/course.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class ArchiveCourseUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
  ) {}

  async execute(id: string, requesterId: string, requesterRole: UserRole): Promise<void> {
    const course = await this.courseRepo.findById(id);
    if (!course) throw new NotFoundException('Course not found');

    const isOwner = course.teacherId === requesterId;
    const isAdmin = requesterRole === UserRole.ADMIN;
    if (!isOwner && !isAdmin) throw new ForbiddenException('Only the course owner or an admin can archive this course');

    if (course.status === CourseStatus.ARCHIVED) {
      throw new UnprocessableEntityException('Course is already archived');
    }

    await this.courseRepo.updateStatus(id, CourseStatus.ARCHIVED);
  }
}
