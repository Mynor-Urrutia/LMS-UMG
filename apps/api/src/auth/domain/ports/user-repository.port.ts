import { UserRole } from '../../../common/interfaces/jwt-payload.interface';

export const AUTH_USER_REPOSITORY = 'AUTH_USER_REPOSITORY';

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: string;
  customRoleId: string | null;
}

export interface StoredRefreshToken {
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface IAuthUserRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
  createUser(email: string, passwordHash: string, firstName?: string, lastName?: string, role?: UserRole): Promise<AuthUser>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
  storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findRefreshToken(tokenHash: string): Promise<StoredRefreshToken | null>;
  // Returns the token if found and successfully revoked, null if already revoked or not found
  atomicRevokeRefreshToken(tokenHash: string): Promise<StoredRefreshToken | null>;
  // Atomically revokes old token and stores new one in a single transaction
  atomicRotateRefreshToken(oldTokenHash: string, newTokenHash: string, userId: string, newExpiresAt: Date): Promise<StoredRefreshToken | null>;
  revokeRefreshToken(tokenHash: string, userId?: string): Promise<void>;
  revokeAllRefreshTokens(userId: string): Promise<void>;
  updatePasswordAndRevokeSessions(userId: string, passwordHash: string): Promise<void>;
}
