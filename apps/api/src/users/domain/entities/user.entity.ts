import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';

export { UserRole, UserStatus };

export interface UserProfile {
  firstName: string;
  lastName: string;
  avatarPath: string | null;
  bio: string | null;
}

export interface UserEntity {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  profile: UserProfile | null;
}
