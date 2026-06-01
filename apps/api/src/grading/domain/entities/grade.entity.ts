export interface GradeEntity {
  id: string;
  submissionId: string;
  teacherId: string | null;
  score: number;
  maxScore: number;
  feedback: string | null;
  gradedAt: Date;
  updatedAt: Date;
}
