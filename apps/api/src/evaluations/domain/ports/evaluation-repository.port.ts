import {
  EvaluationEntity,
  EvaluationWithQuestionsEntity,
  EvaluationQuestionEntity,
  StudentAttemptEntity,
} from '../entities/evaluation.entity';

export const EVALUATION_REPOSITORY = 'EVALUATION_REPOSITORY';

export interface ICreateEvaluationData {
  courseId: string;
  title: string;
  description?: string | null;
  dueDate?: Date | null;
  totalPoints?: number;
}

export interface IAddQuestionData {
  evaluationId: string;
  text: string;
  type: 'TEXT' | 'MCQ' | 'TRUE_FALSE';
  points: number;
  options?: { text: string; isCorrect: boolean }[];
}

export interface ISubmitAttemptData {
  evaluationId: string;
  studentId: string;
  answers: { questionId: string; textAnswer?: string | null; selectedIds?: string[] | null }[];
}

export interface AttemptWithStudentInfo extends StudentAttemptEntity {
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
}

export interface IUpdateEvaluationData {
  title?: string;
  description?: string | null;
  dueDate?: Date | null;
  totalPoints?: number;
  isPublished?: boolean;
}

export interface IEvaluationRepository {
  create(data: ICreateEvaluationData): Promise<EvaluationEntity>;
  findByCourse(courseId: string, publishedOnly?: boolean): Promise<EvaluationEntity[]>;
  findById(id: string): Promise<EvaluationWithQuestionsEntity | null>;
  update(id: string, data: IUpdateEvaluationData): Promise<EvaluationEntity>;
  delete(id: string): Promise<void>;
  addQuestion(data: IAddQuestionData): Promise<EvaluationQuestionEntity>;
  deleteQuestion(questionId: string): Promise<void>;
  submitAttempt(data: ISubmitAttemptData): Promise<StudentAttemptEntity>;
  findAttempt(evaluationId: string, studentId: string): Promise<StudentAttemptEntity | null>;
  findAttemptsByEvaluation(evaluationId: string): Promise<AttemptWithStudentInfo[]>;
  gradeAttempt(attemptId: string, score: number, feedback?: string | null): Promise<StudentAttemptEntity>;
}
