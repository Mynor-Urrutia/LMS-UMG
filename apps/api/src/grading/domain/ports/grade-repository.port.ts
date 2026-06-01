import { GradeEntity } from '../entities/grade.entity';

export const GRADE_REPOSITORY = 'GRADE_REPOSITORY';

export interface ICreateGradeData {
  submissionId: string;
  teacherId: string | null;
  score: number;
  maxScore: number;
  feedback: string | null;
}

export interface IUpdateGradeData {
  score?: number;
  feedback?: string | null;
  /** Always required. TEACHER → actorId. ADMIN → preserve existing grade.teacherId. Never pass null unless the original grade had no teacher. */
  teacherId: string | null;
}

export interface IGradeRepository {
  findBySubmission(submissionId: string): Promise<GradeEntity | null>;
  create(data: ICreateGradeData): Promise<GradeEntity>;
  update(id: string, data: IUpdateGradeData): Promise<GradeEntity>;
  delete(id: string): Promise<void>;
}
