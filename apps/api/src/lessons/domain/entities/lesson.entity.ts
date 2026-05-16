import { LessonType } from '../../../common/enums/lesson-type.enum';

export { LessonType };

export interface LessonEntity {
  id: string;
  moduleId: string;
  fileAssetId: string | null;
  title: string;
  type: LessonType;
  content: string | null;
  videoUrl: string | null;
  filePath: string | null;
  order: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}
