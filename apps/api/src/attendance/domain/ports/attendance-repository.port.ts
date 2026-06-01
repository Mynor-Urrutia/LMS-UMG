import {
  AttendanceSessionEntity,
  AttendanceRecordEntity,
  SessionWithRecords,
  AttendanceStatus,
} from '../entities/attendance.entity';

export const ATTENDANCE_REPOSITORY = 'ATTENDANCE_REPOSITORY';

export interface StudentAttendanceRecord {
  sessionId: string;
  date: Date;
  status: AttendanceStatus;
}

export interface IAttendanceRepository {
  createSession(courseId: string, date: Date, notes?: string): Promise<AttendanceSessionEntity>;
  findSessionsByCourse(courseId: string): Promise<AttendanceSessionEntity[]>;
  findSessionById(sessionId: string): Promise<SessionWithRecords | null>;
  upsertRecord(sessionId: string, studentId: string, status: AttendanceStatus): Promise<AttendanceRecordEntity>;
  getStudentAttendance(courseId: string, studentId: string): Promise<StudentAttendanceRecord[]>;
}
