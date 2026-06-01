import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IEnrollmentRepository, ENROLLMENT_REPOSITORY } from '../../../enrollments/domain/ports/enrollment-repository.port';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/ports/assignment-repository.port';
import { AssignmentEntity } from '../../domain/entities/assignment.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { EnrollmentStatus } from '../../../enrollments/domain/entities/enrollment.entity';

@Injectable()
export class ListAssignmentsUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
  ) {}

  async execute(courseId: string, actorId: string, actorRole: UserRole): Promise<AssignmentEntity[]> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not own this course');
    }

    if (actorRole === UserRole.STUDENT) {
      const enrollment = await this.enrollmentRepo.findByStudentAndCourse(actorId, courseId);
      if (!enrollment || (enrollment.status !== EnrollmentStatus.ACTIVE && enrollment.status !== EnrollmentStatus.COMPLETED)) {
        throw new ForbiddenException('An active enrollment is required to view assignments');
      }
    }

    return this.assignmentRepo.findByCourse(courseId);
  }
}
