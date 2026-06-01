import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CourseStatus } from '../../../common/enums/course-status.enum';
import { EnrollmentType } from '../../../common/enums/enrollment-type.enum';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IEnrollmentRepository, ENROLLMENT_REPOSITORY } from '../../domain/ports/enrollment-repository.port';
import { EnrollmentEntity, EnrollmentStatus } from '../../domain/entities/enrollment.entity';

@Injectable()
export class EnrollUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(courseId: string, studentId: string): Promise<EnrollmentEntity> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new UnprocessableEntityException('Cannot enroll in a course that is not published');
    }

    if (course.enrollmentType === EnrollmentType.INVITATION) {
      throw new ForbiddenException('This course requires an invitation to enroll');
    }

    const existing = await this.enrollmentRepo.findByStudentAndCourse(studentId, courseId);
    if (existing) {
      if (existing.status === EnrollmentStatus.REJECTED) {
        throw new UnprocessableEntityException(
          'Your enrollment was rejected. Contact the course instructor to re-apply.',
        );
      }
      throw new ConflictException('Already enrolled in this course');
    }

    const status =
      course.enrollmentType === EnrollmentType.APPROVAL
        ? EnrollmentStatus.PENDING
        : EnrollmentStatus.ACTIVE;

    const enrollment = await this.enrollmentRepo.create({ studentId, courseId, status });
    this.eventEmitter.emit('enrollment.created', { studentId, courseId });
    return enrollment;
  }
}
