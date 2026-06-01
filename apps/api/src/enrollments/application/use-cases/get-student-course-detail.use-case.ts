import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { UserRole } from '../../../common/enums/user-role.enum';

export interface StudentCourseDetailDto {
  student: { id: string; email: string; firstName: string; lastName: string; bio: string | null };
  enrollment: { id: string; status: string; enrolledAt: Date };
  progress: { percentage: number; completedLessons: number; totalLessons: number };
  assignments: Array<{
    id: string;
    title: string;
    type: string;
    maxScore: number;
    weight: number;
    dueDate: Date | null;
    submission: { id: string; textContent: string | null; fileAssetId: string | null; submittedAt: Date; isLate: boolean } | null;
    grade: { id: string; score: number; maxScore: number; feedback: string | null } | null;
  }>;
}

@Injectable()
export class GetStudentCourseDetailUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
  ) {}

  async execute(courseId: string, studentId: string, actorId: string, actorRole: UserRole): Promise<StudentCourseDetailDto> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not teach this course');
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { courseId, studentId },
      select: { id: true, status: true, enrolledAt: true },
    });
    if (!enrollment) throw new NotFoundException('Student not enrolled in this course');

    const [user, completedCount, totalPublished, assignments] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          email: true,
          profile: { select: { firstName: true, lastName: true, bio: true } },
        },
      }),
      this.prisma.lessonProgress.count({
        where: { studentId, lesson: { module: { courseId } } },
      }),
      this.prisma.lesson.count({
        where: { module: { courseId }, isPublished: true },
      }),
      this.prisma.assignment.findMany({
        where: { courseId },
        select: {
          id: true,
          title: true,
          type: true,
          maxScore: true,
          weight: true,
          dueDate: true,
          submissions: {
            where: { studentId },
            select: {
              id: true,
              textContent: true,
              fileAssetId: true,
              submittedAt: true,
              isLate: true,
              grade: { select: { id: true, score: true, maxScore: true, feedback: true } },
            },
            take: 1,
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    if (!user) throw new NotFoundException('Student not found');

    const progressPercentage =
      totalPublished === 0 ? 0 : Math.round((completedCount / totalPublished) * 100);

    return {
      student: {
        id: user.id,
        email: user.email,
        firstName: user.profile?.firstName ?? '',
        lastName: user.profile?.lastName ?? '',
        bio: user.profile?.bio ?? null,
      },
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
      },
      progress: {
        percentage: progressPercentage,
        completedLessons: completedCount,
        totalLessons: totalPublished,
      },
      assignments: assignments.map(a => ({
        id: a.id,
        title: a.title,
        type: a.type,
        maxScore: a.maxScore,
        weight: a.weight,
        dueDate: a.dueDate,
        submission: a.submissions[0]
          ? {
              id: a.submissions[0].id,
              textContent: a.submissions[0].textContent,
              fileAssetId: a.submissions[0].fileAssetId,
              submittedAt: a.submissions[0].submittedAt,
              isLate: a.submissions[0].isLate,
            }
          : null,
        grade: a.submissions[0]?.grade ?? null,
      })),
    };
  }
}
