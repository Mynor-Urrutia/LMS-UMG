export interface CourseReviewEntity {
  id: string;
  courseId: string;
  studentId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  student?: { id: string; firstName: string; lastName: string } | null;
}
