import { CourseReviewEntity } from '../entities/course-review.entity';

export const COURSE_REVIEW_REPOSITORY = 'COURSE_REVIEW_REPOSITORY';

export interface ICreateReviewData {
  courseId: string;
  studentId: string;
  rating: number;
  comment: string | null;
}

export interface ListReviewsResult {
  items: CourseReviewEntity[];
  total: number;
  avgRating: number | null;
}

export interface ICourseReviewRepository {
  findById(id: string): Promise<CourseReviewEntity | null>;
  findByStudentAndCourse(studentId: string, courseId: string): Promise<CourseReviewEntity | null>;
  listByCourse(courseId: string, page: number, limit: number): Promise<ListReviewsResult>;
  create(data: ICreateReviewData): Promise<CourseReviewEntity>;
  delete(id: string): Promise<void>;
}
