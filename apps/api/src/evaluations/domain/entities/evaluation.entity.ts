export interface EvaluationEntity {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  totalPoints: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type QuestionType = 'TEXT' | 'MCQ' | 'TRUE_FALSE';

export interface QuestionOptionEntity {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface EvaluationQuestionEntity {
  id: string;
  evaluationId: string;
  text: string;
  type: QuestionType;
  points: number;
  order: number;
  options: QuestionOptionEntity[];
}

export interface EvaluationWithQuestionsEntity extends EvaluationEntity {
  questions: EvaluationQuestionEntity[];
}

export interface StudentAttemptAnswer {
  questionId: string;
  textAnswer?: string | null;
  selectedIds?: string[] | null;
}

export interface AttemptAnswerEntity {
  id: string;
  questionId: string;
  textAnswer: string | null;
  selectedIds: string | null;
}

export interface StudentAttemptEntity {
  id: string;
  evaluationId: string;
  studentId: string;
  submittedAt: Date;
  score: number | null;
  feedback: string | null;
  answers: AttemptAnswerEntity[];
}
