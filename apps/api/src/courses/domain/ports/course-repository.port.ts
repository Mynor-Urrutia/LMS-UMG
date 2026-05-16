import { CourseEntity } from '../entities/course.entity';
import { CourseStatus } from '../../../common/enums/course-status.enum';
import { CourseDifficulty } from '../../../common/enums/course-difficulty.enum';
import { EnrollmentType } from '../../../common/enums/enrollment-type.enum';

export const COURSE_REPOSITORY = 'COURSE_REPOSITORY';

export interface ICreateCourseData {
  teacherId: string;
  categoryId: string | null;
  title: string;
  slug: string;
  description: string | null;
  difficulty: CourseDifficulty;
  enrollmentType: EnrollmentType;
}

export interface IUpdateCourseData {
  title?: string;
  description?: string | null;
  difficulty?: CourseDifficulty;
  enrollmentType?: EnrollmentType;
  categoryId?: string | null;
}

export interface ListCoursesFilter {
  page: number;
  limit: number;
  status?: CourseStatus;
  categoryId?: string;
  difficulty?: CourseDifficulty;
  teacherId?: string;
  search?: string;
}

export interface PaginatedCourses {
  items: CourseEntity[];
  total: number;
  page: number;
  limit: number;
}

export interface ICourseRepository {
  findById(id: string): Promise<CourseEntity | null>;
  findBySlug(slug: string): Promise<CourseEntity | null>;
  existsBySlug(slug: string): Promise<boolean>;
  findAll(filter: ListCoursesFilter): Promise<PaginatedCourses>;
  create(data: ICreateCourseData): Promise<CourseEntity>;
  update(id: string, data: IUpdateCourseData): Promise<CourseEntity>;
  updateStatus(id: string, status: CourseStatus): Promise<void>;
  delete(id: string): Promise<void>;
}
