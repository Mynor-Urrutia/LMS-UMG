import { LessonEntity } from '../entities/lesson.entity';
import { LessonType } from '../../../common/enums/lesson-type.enum';

export const LESSON_REPOSITORY = 'LESSON_REPOSITORY';

export interface ICreateLessonData {
  moduleId: string;
  title: string;
  type: LessonType;
  content: string | null;
  videoUrl: string | null;
  order: number;
}

export interface IUpdateLessonData {
  title?: string;
  content?: string | null;
  videoUrl?: string | null;
}

export interface ILessonRepository {
  findById(id: string): Promise<LessonEntity | null>;
  findByModule(moduleId: string): Promise<LessonEntity[]>;
  maxOrder(moduleId: string): Promise<number>;
  create(data: ICreateLessonData): Promise<LessonEntity>;
  update(id: string, data: IUpdateLessonData): Promise<LessonEntity>;
  updatePublished(id: string, isPublished: boolean): Promise<void>;
  reorder(moduleId: string, orderedIds: string[]): Promise<void>;
  delete(id: string): Promise<void>;
}
