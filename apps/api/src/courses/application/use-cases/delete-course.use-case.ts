import { ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../domain/ports/course-repository.port';
import { CourseStatus } from '../../domain/entities/course.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class DeleteCourseUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
  ) {}

  async execute(id: string, requesterId: string, requesterRole: UserRole): Promise<void> {
    const course = await this.courseRepo.findById(id);
    if (!course) throw new NotFoundException('Course not found');

    const isOwner = course.teacherId === requesterId;
    const isAdmin = requesterRole === UserRole.ADMIN;
    if (!isOwner && !isAdmin) throw new ForbiddenException('Only the course owner or an admin can delete this course');

    // Only DRAFT courses can be deleted — published/archived courses have enrolled students
    if (course.status !== CourseStatus.DRAFT) {
      throw new UnprocessableEntityException('Only draft courses can be deleted');
    }

    await this.courseRepo.delete(id);
  }
}
