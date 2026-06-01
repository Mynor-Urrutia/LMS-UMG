import { Injectable } from '@nestjs/common';
import { EnrollmentStatus as PrismaEnrollmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  IEnrollmentRepository,
  ICreateEnrollmentData,
  EnrollmentWithStudentEntity,
  StudentProgressRaw,
} from '../../domain/ports/enrollment-repository.port';
import { EnrollmentEntity, EnrollmentStatus } from '../../domain/entities/enrollment.entity';

const ENROLLMENT_SELECT = {
  id: true,
  studentId: true,
  courseId: true,
  status: true,
  enrolledAt: true,
  updatedAt: true,
} as const;

type EnrollmentRow = Prisma.EnrollmentGetPayload<{ select: typeof ENROLLMENT_SELECT }>;

@Injectable()
export class PrismaEnrollmentsAdapter implements IEnrollmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<EnrollmentEntity | null> {
    const row = await this.prisma.enrollment.findUnique({ where: { id }, select: ENROLLMENT_SELECT });
    return row ? this.toEntity(row) : null;
  }

  async findByStudentAndCourse(studentId: string, courseId: string): Promise<EnrollmentEntity | null> {
    const row = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
      select: ENROLLMENT_SELECT,
    });
    return row ? this.toEntity(row) : null;
  }

  async findByStudent(studentId: string): Promise<EnrollmentEntity[]> {
    const rows = await this.prisma.enrollment.findMany({
      where: { studentId },
      select: ENROLLMENT_SELECT,
      orderBy: { enrolledAt: 'desc' },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async findByCourse(courseId: string, status?: EnrollmentStatus): Promise<EnrollmentWithStudentEntity[]> {
    const rows = await this.prisma.enrollment.findMany({
      where: { courseId, ...(status ? { status: status as PrismaEnrollmentStatus } : {}) },
      orderBy: { enrolledAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      courseId: r.courseId,
      status: r.status as EnrollmentStatus,
      enrolledAt: r.enrolledAt,
      updatedAt: r.updatedAt,
      student: {
        id: r.student.id,
        email: r.student.email,
        firstName: r.student.profile?.firstName ?? null,
        lastName: r.student.profile?.lastName ?? null,
      },
    }));
  }

  async findCourseStudentsWithProgress(courseId: string): Promise<StudentProgressRaw[]> {
    const rows = await this.prisma.enrollment.findMany({
      where: { courseId },
      orderBy: { enrolledAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true } },
            lessonProgress: {
              where: { lesson: { isPublished: true, module: { courseId } } },
              select: { id: true },
            },
            submissions: {
              where: { assignment: { courseId } },
              include: {
                assignment: { select: { id: true, title: true, maxScore: true } },
                grade: { select: { score: true, maxScore: true } },
              },
            },
            attempts: {
              where: { evaluation: { courseId } },
              select: {
                score: true,
                evaluation: { select: { id: true, title: true, totalPoints: true } },
              },
            },
            xp: { select: { totalXp: true } },
          },
        },
      },
    });

    return rows.map((row) => ({
      enrollmentId: row.id,
      enrollmentStatus: row.status as EnrollmentStatus,
      enrolledAt: row.enrolledAt,
      studentId: row.studentId,
      firstName: row.student.profile?.firstName ?? '',
      lastName: row.student.profile?.lastName ?? '',
      email: row.student.email,
      completedLessons: row.student.lessonProgress.length,
      grades: row.student.submissions.map((s) => ({
        assignmentId: s.assignmentId,
        assignmentTitle: s.assignment.title,
        score: s.grade?.score ?? null,
        maxScore: s.assignment.maxScore,
      })),
      evaluationGrades: row.student.attempts.map((a) => ({
        evaluationId: a.evaluation.id,
        evaluationTitle: a.evaluation.title,
        score: a.score ?? null,
        maxScore: a.evaluation.totalPoints,
      })),
      totalXp: row.student.xp?.totalXp ?? 0,
    }));
  }

  async create(data: ICreateEnrollmentData): Promise<EnrollmentEntity> {
    const row = await this.prisma.enrollment.create({
      data: {
        studentId: data.studentId,
        courseId: data.courseId,
        status: data.status as PrismaEnrollmentStatus,
      },
      select: ENROLLMENT_SELECT,
    });
    return this.toEntity(row);
  }

  async updateStatus(id: string, status: EnrollmentStatus): Promise<void> {
    await this.prisma.enrollment.update({
      where: { id },
      data: { status: status as PrismaEnrollmentStatus },
      select: { id: true },
    });
  }

  private toEntity(row: EnrollmentRow): EnrollmentEntity {
    return {
      id: row.id,
      studentId: row.studentId,
      courseId: row.courseId,
      // Direct cast safe: Prisma and domain enums share identical string values by design
      status: row.status as EnrollmentStatus,
      enrolledAt: row.enrolledAt,
      updatedAt: row.updatedAt,
    };
  }
}
