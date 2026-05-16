import { UserEntity } from '../entities/user.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';

export const USER_REPOSITORY = 'USER_REPOSITORY';

export interface ListUsersFilter {
  page: number;
  limit: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

export interface PaginatedUsers {
  items: UserEntity[];
  total: number;
  page: number;
  limit: number;
}

export interface ProfileData {
  firstName?: string;
  lastName?: string;
  bio?: string;
  // avatarPath intentionally excluded — handled by a dedicated file-upload endpoint
}

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  listUsers(filter: ListUsersFilter): Promise<PaginatedUsers>;
  upsertProfile(userId: string, data: ProfileData): Promise<UserEntity>;
  // Atomically checks last-admin invariant and updates role in a serializable transaction
  atomicChangeRole(userId: string, newRole: UserRole): Promise<'ok' | 'last-admin-blocked'>;
  changeStatus(userId: string, status: UserStatus): Promise<void>;
}
