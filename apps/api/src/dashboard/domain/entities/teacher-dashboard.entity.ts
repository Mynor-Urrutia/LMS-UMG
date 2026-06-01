export interface TeacherCourseStats {
  courseId: string;
  title: string;
  slug: string;
  status: string;
  activeStudentCount: number;
  pendingGradeCount: number;
}

export interface TeacherDashboard {
  userId: string;
  courses: TeacherCourseStats[];
}
