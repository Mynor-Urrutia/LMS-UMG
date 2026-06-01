export interface CourseAnnouncementEntity {
  id: string;
  courseId: string;
  authorId: string | null;
  authorName: string | null;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
