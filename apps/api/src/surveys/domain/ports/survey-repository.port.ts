import { SurveyAnswerInput, SurveyEntity, SurveyQuestionEntity, SurveyResultItem } from '../entities/survey.entity';
import { SurveyQuestionType } from '../../../common/enums/survey-question-type.enum';

export const SURVEY_REPOSITORY = 'SURVEY_REPOSITORY';

export interface ICreateSurveyData {
  courseId?: string;
  title: string;
  description?: string;
  isAnonymous?: boolean;
  questions: { text: string; type: SurveyQuestionType; options?: string[] }[];
}

export interface ISurveyRepository {
  findById(id: string): Promise<SurveyEntity | null>;
  findByCourse(courseId: string): Promise<SurveyEntity[]>;
  findQuestions(surveyId: string): Promise<SurveyQuestionEntity[]>;
  create(data: ICreateSurveyData): Promise<SurveyEntity>;
  open(id: string): Promise<void>;
  close(id: string): Promise<void>;
  delete(id: string): Promise<void>;
  submitResponse(surveyId: string, userId: string | null, answers: SurveyAnswerInput[]): Promise<void>;
  hasResponded(surveyId: string, userId: string): Promise<boolean>;
  getResults(surveyId: string): Promise<SurveyResultItem[]>;
}
