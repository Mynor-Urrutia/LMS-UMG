import { Injectable } from '@nestjs/common';
import { AttendanceStatus as PrismaAttendanceStatus } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  IAttendanceRepository,
  StudentAttendanceRecord,
} from '../../domain/ports/attendance-repository.port';
import {
  AttendanceSessionEntity,
  AttendanceRecordEntity,
  SessionWithRecords,
  AttendanceStatus,
} from '../../domain/entities/attendance.entity';

@Injectable()
export class PrismaAttendanceAdapter implements IAttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(courseId: string, date: Date, notes?: string): Promise<AttendanceSessionEntity> {
    const row = await this.prisma.attendanceSession.create({
      data: { courseId, date, notes: notes ?? null },
    });
    return this.toSessionEntity(row);
  }

  async findSessionsByCourse(courseId: string): Promise<AttendanceSessionEntity[]> {
    const rows = await this.prisma.attendanceSession.findMany({
      where: { courseId },
      orderBy: { date: 'desc' },
    });
    return rows.map((r) => this.toSessionEntity(r));
  }

  async findSessionById(sessionId: string): Promise<SessionWithRecords | null> {
    const row = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        records: {
          include: {
            student: {
              include: { profile: { select: { firstName: true, lastName: true } } },
            },
          },
          orderBy: { student: { email: 'asc' } },
        },
      },
    });
    if (!row) return null;
    return {
      ...this.toSessionEntity(row),
      records: row.records.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        studentId: r.studentId,
        status: r.status as AttendanceStatus,
        studentFirstName: r.student.profile?.firstName ?? '',
        studentLastName: r.student.profile?.lastName ?? '',
        studentEmail: r.student.email,
      })),
    };
  }

  async upsertRecord(
    sessionId: string,
    studentId: string,
    status: AttendanceStatus,
  ): Promise<AttendanceRecordEntity> {
    const row = await this.prisma.attendanceRecord.upsert({
      where: { sessionId_studentId: { sessionId, studentId } },
      create: { sessionId, studentId, status: status as PrismaAttendanceStatus },
      update: { status: status as PrismaAttendanceStatus },
    });
    return {
      id: row.id,
      sessionId: row.sessionId,
      studentId: row.studentId,
      status: row.status as AttendanceStatus,
    };
  }

  async getStudentAttendance(courseId: string, studentId: string): Promise<StudentAttendanceRecord[]> {
    const rows = await this.prisma.attendanceRecord.findMany({
      where: {
        studentId,
        session: { courseId },
      },
      include: { session: { select: { date: true } } },
      orderBy: { session: { date: 'desc' } },
    });
    return rows.map((r) => ({
      sessionId: r.sessionId,
      date: r.session.date,
      status: r.status as AttendanceStatus,
    }));
  }

  private toSessionEntity(row: {
    id: string;
    courseId: string;
    date: Date;
    notes: string | null;
    createdAt: Date;
  }): AttendanceSessionEntity {
    return {
      id: row.id,
      courseId: row.courseId,
      date: row.date,
      notes: row.notes,
      createdAt: row.createdAt,
    };
  }
}
