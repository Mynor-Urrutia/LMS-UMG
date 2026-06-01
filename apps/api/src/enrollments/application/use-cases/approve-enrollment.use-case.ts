import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IEnrollmentRepository, ENROLLMENT_REPOSITORY } from '../../domain/ports/enrollment-repository.port';
import { EnrollmentStatus } from '../../domain/entities/enrollment.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class ApproveEnrollmentUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
  ) {}

  async execute(
    enrollmentId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<void> {
    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const course = await this.courseRepo.findById(enrollment.courseId);
    if (!course) throw new NotFoundException('Course not found');

    const isAdmin = requesterRole === UserRole.ADMIN;
    const isOwner = course.teacherId === requesterId;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Only the course owner or an admin can approve enrollments');
    }

    if (enrollment.status !== EnrollmentStatus.PENDING) {
      throw new UnprocessableEntityException('Only PENDING enrollments can be approved');
    }

    await this.enrollmentRepo.updateStatus(enrollmentId, EnrollmentStatus.ACTIVE);
  }
}
