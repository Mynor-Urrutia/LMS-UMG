import { LessonType } from '../../../common/enums/lesson-type.enum';

export interface LessonSummary {
  id: string;
  title: string;
  type: LessonType;
  order: number;
  isPublished: boolean;
}

export interface CourseModuleEntity {
  id: string;
  courseId: string;
  title: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseModuleWithLessons extends CourseModuleEntity {
  lessons: LessonSummary[];
}
