export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AttendanceSessionEntity {
  id: string;
  courseId: string;
  date: Date;
  notes: string | null;
  createdAt: Date;
}

export interface AttendanceRecordEntity {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
}

export interface RecordWithStudentInfo extends AttendanceRecordEntity {
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
}

export interface SessionWithRecords extends AttendanceSessionEntity {
  records: RecordWithStudentInfo[];
}
