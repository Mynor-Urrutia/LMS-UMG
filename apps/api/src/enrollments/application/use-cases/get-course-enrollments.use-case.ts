import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IEnrollmentRepository, ENROLLMENT_REPOSITORY, EnrollmentWithStudentEntity } from '../../domain/ports/enrollment-repository.port';
import { EnrollmentStatus } from '../../domain/entities/enrollment.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class GetCourseEnrollmentsUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
  ) {}

  async execute(
    courseId: string,
    requesterId: string,
    requesterRole: UserRole,
    status?: EnrollmentStatus,
  ): Promise<EnrollmentWithStudentEntity[]> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const isAdmin = requesterRole === UserRole.ADMIN;
    const isOwner = course.teacherId === requesterId;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Only the course owner or an admin can view enrollments');
    }

    return this.enrollmentRepo.findByCourse(courseId, status);
  }
}
