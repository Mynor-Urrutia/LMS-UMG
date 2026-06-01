import { SubmissionEntity } from '../entities/submission.entity';

export const SUBMISSION_REPOSITORY = 'SUBMISSION_REPOSITORY';

export interface ICreateSubmissionData {
  studentId: string;
  assignmentId: string;
  textContent: string | null;
  fileAssetId: string | null;
  choiceId?: string | null;
  isLate: boolean;
}

export interface IUpdateSubmissionData {
  textContent?: string | null;
  fileAssetId?: string | null;
  isLate?: boolean;
}

export interface SubmissionWithStudentInfo extends SubmissionEntity {
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
  grade: { id: string; score: number; maxScore: number; feedback: string | null } | null;
}

export interface ISubmissionRepository {
  findById(id: string): Promise<SubmissionEntity | null>;
  findByStudentAndAssignment(studentId: string, assignmentId: string): Promise<SubmissionEntity | null>;
  findByAssignment(assignmentId: string): Promise<SubmissionEntity[]>;
  findByAssignmentWithStudents(assignmentId: string): Promise<SubmissionWithStudentInfo[]>;
  create(data: ICreateSubmissionData): Promise<SubmissionEntity>;
  update(id: string, data: IUpdateSubmissionData): Promise<SubmissionEntity>;
  delete(id: string): Promise<void>;
  hasGrade(submissionId: string): Promise<boolean>;
}
