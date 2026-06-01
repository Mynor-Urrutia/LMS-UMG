import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IEnrollmentRepository, ENROLLMENT_REPOSITORY } from '../../domain/ports/enrollment-repository.port';
import { ILessonRepository, LESSON_REPOSITORY } from '../../../lessons/domain/ports/lesson-repository.port';
import { ILessonProgressRepository, LESSON_PROGRESS_REPOSITORY } from '../../domain/ports/lesson-progress-repository.port';
import { EnrollmentStatus } from '../../domain/entities/enrollment.entity';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface CourseProgressResult {
  progress: number;
  completedLessons: number;
  totalLessons: number;
  submittedAssignments: number;
  totalAssignments: number;
}

@Injectable()
export class GetCourseProgressUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
    @Inject(LESSON_REPOSITORY) private readonly lessonRepo: ILessonRepository,
    @Inject(LESSON_PROGRESS_REPOSITORY) private readonly lessonProgressRepo: ILessonProgressRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(courseId: string, studentId: string): Promise<CourseProgressResult> {
    const [course, enrollment] = await Promise.all([
      this.courseRepo.findById(courseId),
      this.enrollmentRepo.findByStudentAndCourse(studentId, courseId),
    ]);

    if (!course) throw new NotFoundException('Course not found');
    if (!enrollment || (enrollment.status !== EnrollmentStatus.ACTIVE && enrollment.status !== EnrollmentStatus.COMPLETED)) {
      throw new ForbiddenException('An active or completed enrollment is required to view course progress');
    }

    const [totalLessons, completedLessons, totalAssignments, submittedAssignments] = await Promise.all([
      this.lessonRepo.countPublished(courseId),
      this.lessonProgressRepo.countCompleted(studentId, courseId),
      this.prisma.assignment.count({ where: { courseId } }),
      this.prisma.submission.count({ where: { studentId, assignment: { courseId } } }),
    ]);

    const clampedLessons = Math.min(completedLessons, totalLessons);
    const clampedSubmissions = Math.min(submittedAssignments, totalAssignments);

    const totalItems = totalLessons + totalAssignments;
    const completedItems = clampedLessons + clampedSubmissions;

    const progress = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

    return {
      progress,
      completedLessons: clampedLessons,
      totalLessons,
      submittedAssignments: clampedSubmissions,
      totalAssignments,
    };
  }
}
