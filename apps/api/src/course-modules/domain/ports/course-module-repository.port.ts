import { CourseModuleEntity, CourseModuleWithLessons } from '../entities/course-module.entity';

export const MODULE_REPOSITORY = 'MODULE_REPOSITORY';

export interface ICreateModuleData {
  courseId: string;
  title: string;
  order: number;
}

export interface IUpdateModuleData {
  title?: string;
}

export interface IModuleRepository {
  findById(id: string): Promise<CourseModuleEntity | null>;
  findByCourse(courseId: string): Promise<CourseModuleWithLessons[]>;
  maxOrder(courseId: string): Promise<number>;
  create(data: ICreateModuleData): Promise<CourseModuleEntity>;
  update(id: string, data: IUpdateModuleData): Promise<CourseModuleEntity>;
  reorder(courseId: string, orderedIds: string[]): Promise<void>;
  delete(id: string): Promise<void>;
}
