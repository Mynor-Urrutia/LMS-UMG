import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { IDashboardRepository } from '../../domain/ports/dashboard-repository.port';
import { StudentDashboard } from '../../domain/entities/student-dashboard.entity';
import { TeacherDashboard } from '../../domain/entities/teacher-dashboard.entity';
import { getLevelFromXp } from '../../../common/utils/xp-levels';

@Injectable()
export class PrismaDashboardAdapter implements IDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getStudentDashboard(userId: string): Promise<StudentDashboard> {
    const [enrollments, xp, badgeCount] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { studentId: userId, status: { in: ['ACTIVE', 'COMPLETED'] } },
        select: {
          id: true,
          courseId: true,
          enrolledAt: true,
          status: true,
          course: { select: { title: true, slug: true } },
        },
        orderBy: [{ status: 'asc' }, { enrolledAt: 'desc' }],
      }),
      this.prisma.userXp.findUnique({ where: { userId }, select: { totalXp: true } }),
      this.prisma.userBadge.count({ where: { userId } }),
    ]);

    const courseIds = enrollments.map(e => e.courseId);

    const [allLessons, completedProgress] = await Promise.all([
      this.prisma.lesson.findMany({
        where: { isPublished: true, module: { courseId: { in: courseIds } } },
        select: { id: true, module: { select: { courseId: true } } },
      }),
      this.prisma.lessonProgress.findMany({
        where: { studentId: userId, lesson: { module: { courseId: { in: courseIds } } } },
        select: { lessonId: true, lesson: { select: { module: { select: { courseId: true } } } } },
      }),
    ]);

    const totalMap = new Map<string, number>();
    for (const l of allLessons) {
      const cId = l.module.courseId;
      totalMap.set(cId, (totalMap.get(cId) ?? 0) + 1);
    }

    const completedMap = new Map<string, number>();
    for (const p of completedProgress) {
      const cId = p.lesson.module.courseId;
      completedMap.set(cId, (completedMap.get(cId) ?? 0) + 1);
    }

    const totalXp = xp?.totalXp ?? 0;
    return {
      userId,
      totalXp,
      level: getLevelFromXp(totalXp),
      badgeCount,
      courses: enrollments.map(e => ({
        enrollmentId: e.id,
        courseId: e.courseId,
        courseTitle: e.course.title,
        courseSlug: e.course.slug,
        enrolledAt: e.enrolledAt,
        enrollmentStatus: e.status as 'ACTIVE' | 'COMPLETED',
        totalLessons: totalMap.get(e.courseId) ?? 0,
        completedLessons: completedMap.get(e.courseId) ?? 0,
      })),
    };
  }

  async getTeacherDashboard(userId: string, isAdmin = false): Promise<TeacherDashboard> {
    const courses = await this.prisma.course.findMany({
      where: isAdmin ? {} : { teacherId: userId },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        assignments: {
          select: {
            _count: { select: { submissions: { where: { grade: null } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const courseIds = courses.map(c => c.id);
    const activeEnrollments = await this.prisma.enrollment.groupBy({
      by: ['courseId'],
      where: { courseId: { in: courseIds }, status: 'ACTIVE' },
      _count: { _all: true },
    });

    const activeMap = new Map(activeEnrollments.map(e => [e.courseId, e._count._all]));

    return {
      userId,
      courses: courses.map(c => ({
        courseId: c.id,
        title: c.title,
        slug: c.slug,
        status: c.status,
        activeStudentCount: activeMap.get(c.id) ?? 0,
        pendingGradeCount: c.assignments.reduce((sum, a) => sum + a._count.submissions, 0),
      })),
    };
  }
}
