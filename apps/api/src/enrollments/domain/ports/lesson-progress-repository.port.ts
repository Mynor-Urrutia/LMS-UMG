export const LESSON_PROGRESS_REPOSITORY = 'LESSON_PROGRESS_REPOSITORY';

export interface ILessonProgressRepository {
  // Idempotent upsert — completedAt is set only on first creation
  upsert(studentId: string, lessonId: string): Promise<void>;
  // Count completed lessons for a student in a course (published lessons only)
  countCompleted(studentId: string, courseId: string): Promise<number>;
}
