import { AssignmentType } from '../../../common/enums/assignment-type.enum';

export { AssignmentType };

export interface AssignmentEntity {
  id: string;
  courseId: string;
  lessonId: string | null;
  title: string;
  description: string | null;
  type: AssignmentType;
  dueDate: Date | null;
  allowLate: boolean;
  maxScore: number;
  weight: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizQuestionEntity {
  id: string;
  assignmentId: string;
  question: string;
  options: string[];
  correctOption: number;
  order: number;
  createdAt: Date;
}

export type QuizQuestionPublicEntity = Omit<QuizQuestionEntity, 'correctOption'>;

export interface DilemmaChoiceEntity {
  id: string;
  scenarioId: string;
  text: string;
  consequence: string;
  ethicalScore: number;
  order: number;
}

export interface DilemmaScenarioEntity {
  id: string;
  assignmentId: string;
  scenario: string;
  choices: DilemmaChoiceEntity[];
  createdAt: Date;
  updatedAt: Date;
}
