import { EnrollmentEntity, EnrollmentStatus } from '../entities/enrollment.entity';

export const ENROLLMENT_REPOSITORY = 'ENROLLMENT_REPOSITORY';

export interface ICreateEnrollmentData {
  studentId: string;
  courseId: string;
  status: EnrollmentStatus;
}

export interface EnrollmentStudentInfo {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface EnrollmentWithStudentEntity extends EnrollmentEntity {
  student: EnrollmentStudentInfo;
}

export interface StudentGradeItem {
  assignmentId: string;
  assignmentTitle: string;
  score: number | null;
  maxScore: number;
}

export interface EvaluationGradeItem {
  evaluationId: string;
  evaluationTitle: string;
  score: number | null;
  maxScore: number;
}

export interface StudentProgressRaw {
  enrollmentId: string;
  enrollmentStatus: EnrollmentStatus;
  enrolledAt: Date;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  completedLessons: number;
  grades: StudentGradeItem[];
  evaluationGrades: EvaluationGradeItem[];
  totalXp: number;
}

export interface IEnrollmentRepository {
  findById(id: string): Promise<EnrollmentEntity | null>;
  findByStudentAndCourse(studentId: string, courseId: string): Promise<EnrollmentEntity | null>;
  findByStudent(studentId: string): Promise<EnrollmentEntity[]>;
  findByCourse(courseId: string, status?: EnrollmentStatus): Promise<EnrollmentWithStudentEntity[]>;
  findCourseStudentsWithProgress(courseId: string): Promise<StudentProgressRaw[]>;
  create(data: ICreateEnrollmentData): Promise<EnrollmentEntity>;
  updateStatus(id: string, status: EnrollmentStatus): Promise<void>;
}
