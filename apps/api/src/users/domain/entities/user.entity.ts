import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';

export { UserRole, UserStatus };

export interface AcademicRef { id: string; name: string; }

export interface UserProfile {
  firstName: string;
  lastName: string;
  carnet: string | null;
  avatarPath: string | null;
  bio: string | null;
  gradeId: string | null;
  sectionId: string | null;
  departmentId: string | null;
  grade: AcademicRef | null;
  section: AcademicRef | null;
  department: AcademicRef | null;
}

export interface UserEntity {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  customRoleId: string | null;
  createdAt: Date;
  updatedAt: Date;
  profile: UserProfile | null;
}
