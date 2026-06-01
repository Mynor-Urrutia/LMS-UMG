import { SurveyQuestionType } from '../../../common/enums/survey-question-type.enum';

export { SurveyQuestionType };

export interface SurveyEntity {
  id: string;
  courseId: string | null;
  title: string;
  description: string | null;
  isAnonymous: boolean;
  isOpen: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SurveyQuestionEntity {
  id: string;
  surveyId: string;
  text: string;
  type: SurveyQuestionType;
  options: string[] | null;
  order: number;
}

export interface SurveyAnswerInput {
  questionId: string;
  textAnswer?: string;
  selected?: number[];
}

export interface SurveyResultItem {
  questionId: string;
  text: string;
  type: SurveyQuestionType;
  options: string[] | null;
  totalResponses: number;
  textAnswers: string[];
  optionCounts: number[];
}
