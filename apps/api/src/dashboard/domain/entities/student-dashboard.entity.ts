export interface CourseProgress {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  enrolledAt: Date;
  enrollmentStatus: 'ACTIVE' | 'COMPLETED';
  totalLessons: number;
  completedLessons: number;
}

export interface StudentDashboard {
  userId: string;
  totalXp: number;
  level: number;
  badgeCount: number;
  courses: CourseProgress[];
}
