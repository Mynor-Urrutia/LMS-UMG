import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../domain/ports/course-repository.port';
import { CourseEntity, CourseStatus } from '../../domain/entities/course.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class GetCourseUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
  ) {}

  async execute(slug: string, requesterId: string, requesterRole: UserRole): Promise<CourseEntity> {
    const course = await this.courseRepo.findBySlug(slug);
    if (!course) throw new NotFoundException('Course not found');

    // DRAFT and ARCHIVED courses are visible only to the owner and admins
    if (course.status !== CourseStatus.PUBLISHED) {
      const isOwner = course.teacherId === requesterId;
      const isAdmin = requesterRole === UserRole.ADMIN;
      if (!isOwner && !isAdmin) throw new NotFoundException('Course not found');
    }

    return course;
  }
}
