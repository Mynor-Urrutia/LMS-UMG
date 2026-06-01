import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import {
  IEnrollmentRepository,
  ENROLLMENT_REPOSITORY,
  StudentGradeItem,
  EvaluationGradeItem,
} from '../../domain/ports/enrollment-repository.port';
import { ILessonRepository, LESSON_REPOSITORY } from '../../../lessons/domain/ports/lesson-repository.port';
import { EnrollmentStatus } from '../../domain/entities/enrollment.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface StudentProgressResult {
  enrollmentId: string;
  enrollmentStatus: EnrollmentStatus;
  enrolledAt: Date;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  progressPercentage: number;
  completedLessons: number;
  totalLessons: number;
  submittedAssignments: number;
  totalAssignments: number;
  grades: StudentGradeItem[];
  evaluationGrades: EvaluationGradeItem[];
  overallGrade: number | null;
  totalXp: number;
}

@Injectable()
export class GetCourseStudentsProgressUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
    @Inject(LESSON_REPOSITORY) private readonly lessonRepo: ILessonRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    courseId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<StudentProgressResult[]> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const isAdmin = requesterRole === UserRole.ADMIN;
    const isOwner = course.teacherId === requesterId;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Only the course owner or an admin can view student progress');
    }

    const [students, totalLessons, totalAssignments] = await Promise.all([
      this.enrollmentRepo.findCourseStudentsWithProgress(courseId),
      this.lessonRepo.countPublished(courseId),
      this.prisma.assignment.count({ where: { courseId } }),
    ]);

    // Fetch submission counts per student in a single query
    const submissionCounts = await this.prisma.submission.groupBy({
      by: ['studentId'],
      where: { assignment: { courseId }, studentId: { in: students.map((s) => s.studentId) } },
      _count: { id: true },
    });
    const submissionMap = new Map(submissionCounts.map((r) => [r.studentId, r._count.id]));

    return students.map((s) => {
      const clampedLessons = Math.min(s.completedLessons, totalLessons);
      const submittedAssignments = Math.min(submissionMap.get(s.studentId) ?? 0, totalAssignments);

      const totalItems = totalLessons + totalAssignments;
      const completedItems = clampedLessons + submittedAssignments;
      const progressPercentage = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

      const allGraded = [
        ...s.grades.filter((g) => g.score !== null).map((g) => ({ score: g.score!, maxScore: g.maxScore })),
        ...s.evaluationGrades.filter((g) => g.score !== null).map((g) => ({ score: g.score!, maxScore: g.maxScore })),
      ];
      const overallGrade =
        allGraded.length === 0
          ? null
          : Math.round(allGraded.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / allGraded.length);

      return {
        enrollmentId: s.enrollmentId,
        enrollmentStatus: s.enrollmentStatus,
        enrolledAt: s.enrolledAt,
        studentId: s.studentId,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        progressPercentage,
        completedLessons: clampedLessons,
        totalLessons,
        submittedAssignments,
        totalAssignments,
        grades: s.grades,
        evaluationGrades: s.evaluationGrades,
        overallGrade,
        totalXp: s.totalXp,
      };
    });
  }
}
