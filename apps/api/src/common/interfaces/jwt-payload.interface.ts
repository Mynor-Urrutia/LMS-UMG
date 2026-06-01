import { UserRole } from '../enums/user-role.enum';

export { UserRole };

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  customRoleId?: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
}
