import { CourseStatus } from '../../../common/enums/course-status.enum';
import { CourseDifficulty } from '../../../common/enums/course-difficulty.enum';
import { EnrollmentType } from '../../../common/enums/enrollment-type.enum';

export { CourseStatus, CourseDifficulty, EnrollmentType };

export interface CourseEntity {
  id: string;
  teacherId: string;
  categoryId: string | null;
  title: string;
  slug: string;
  description: string | null;
  thumbnailPath: string | null;
  difficulty: CourseDifficulty;
  status: CourseStatus;
  enrollmentType: EnrollmentType;
  createdAt: Date;
  updatedAt: Date;
  teacher?: { id: string; firstName: string; lastName: string } | null;
  category?: { id: string; name: string } | null;
  _count?: { modules: number };
}
