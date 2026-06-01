import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseReviewRepository, COURSE_REVIEW_REPOSITORY } from '../../domain/ports/course-review-repository.port';
import { IEnrollmentRepository, ENROLLMENT_REPOSITORY } from '../../../enrollments/domain/ports/enrollment-repository.port';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { CourseReviewEntity } from '../../domain/entities/course-review.entity';
import { EnrollmentStatus } from '../../../enrollments/domain/entities/enrollment.entity';

export interface ICreateReviewInput {
  courseId: string;
  studentId: string;
  rating: number;
  comment?: string;
}

@Injectable()
export class CreateReviewUseCase {
  constructor(
    @Inject(COURSE_REVIEW_REPOSITORY) private readonly reviewRepo: ICourseReviewRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
  ) {}

  async execute(input: ICreateReviewInput): Promise<CourseReviewEntity> {
    const course = await this.courseRepo.findById(input.courseId);
    if (!course) throw new NotFoundException('Course not found');

    const enrollment = await this.enrollmentRepo.findByStudentAndCourse(input.studentId, input.courseId);
    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException('You must be actively enrolled to review this course');
    }

    const existing = await this.reviewRepo.findByStudentAndCourse(input.studentId, input.courseId);
    if (existing) throw new ConflictException('You have already reviewed this course');

    return this.reviewRepo.create({
      courseId: input.courseId,
      studentId: input.studentId,
      rating: input.rating,
      comment: input.comment ?? null,
    });
  }
}
