import { UserRole } from '../../../common/interfaces/jwt-payload.interface';

export const TOKEN_SERVICE = 'TOKEN_SERVICE';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ITokenService {
  generatePair(payload: AccessTokenPayload): TokenPair;
  verifyRefreshToken(token: string): { sub: string } | null;
  hashToken(token: string): string;
  refreshTokenExpiresAt(): Date;
}
