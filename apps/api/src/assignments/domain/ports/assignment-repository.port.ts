import { AssignmentEntity, AssignmentType, DilemmaChoiceEntity, DilemmaScenarioEntity, QuizQuestionEntity } from '../entities/assignment.entity';

export const ASSIGNMENT_REPOSITORY = 'ASSIGNMENT_REPOSITORY';

export interface ICreateAssignmentData {
  courseId: string;
  lessonId: string | null;
  title: string;
  description: string | null;
  type: AssignmentType;
  dueDate: Date | null;
  allowLate: boolean;
  maxScore: number;
  weight: number;
}

export interface IUpdateAssignmentData {
  title?: string;
  description?: string | null;
  lessonId?: string | null;
  dueDate?: Date | null;
  allowLate?: boolean;
  maxScore?: number;
  weight?: number;
}

export interface ICreateQuizQuestionData {
  assignmentId: string;
  question: string;
  options: string[];
  correctOption: number;
}

export interface IUpdateQuizQuestionData {
  question?: string;
  options?: string[];
  correctOption?: number;
}

export interface ICreateDilemmaChoiceData {
  text: string;
  consequence: string;
  ethicalScore?: number;
}

export interface ICreateDilemmaScenarioData {
  assignmentId: string;
  scenario: string;
  choices: ICreateDilemmaChoiceData[];
}

export interface IAssignmentRepository {
  findById(id: string): Promise<AssignmentEntity | null>;
  findByCourse(courseId: string): Promise<AssignmentEntity[]>;
  create(data: ICreateAssignmentData): Promise<AssignmentEntity>;
  update(id: string, data: IUpdateAssignmentData): Promise<AssignmentEntity>;
  delete(id: string): Promise<void>;
  findQuestionsByAssignment(assignmentId: string): Promise<QuizQuestionEntity[]>;
  findQuestionById(id: string): Promise<QuizQuestionEntity | null>;
  addQuestion(data: ICreateQuizQuestionData): Promise<QuizQuestionEntity>;
  updateQuestion(id: string, data: IUpdateQuizQuestionData): Promise<QuizQuestionEntity>;
  deleteQuestion(id: string): Promise<void>;
  reorderQuestions(assignmentId: string, orderedIds: string[]): Promise<void>;
  createDilemmaScenario(data: ICreateDilemmaScenarioData): Promise<DilemmaScenarioEntity>;
  findDilemmaScenario(assignmentId: string): Promise<DilemmaScenarioEntity | null>;
  findChoiceById(id: string): Promise<DilemmaChoiceEntity | null>;
}
