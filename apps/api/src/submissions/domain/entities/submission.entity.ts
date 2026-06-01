export interface SubmissionEntity {
  id: string;
  studentId: string;
  assignmentId: string;
  textContent: string | null;
  filePath: string | null;
  fileAssetId: string | null;
  choiceId: string | null;
  isLate: boolean;
  submittedAt: Date;
  updatedAt: Date;
  grade?: { id: string; score: number; maxScore: number; feedback: string | null } | null;
  dilemmaChoice?: { id: string; text: string; consequence: string; ethicalScore: number } | null;
}
