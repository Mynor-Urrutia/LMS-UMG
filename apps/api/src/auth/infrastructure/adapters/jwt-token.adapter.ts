import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { AccessTokenPayload, ITokenService, TokenPair } from '../../domain/ports/token-service.port';

@Injectable()
export class JwtTokenAdapter implements ITokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generatePair(payload: AccessTokenPayload): TokenPair {
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: payload.sub },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
        algorithm: 'HS256',
      },
    );
    return { accessToken, refreshToken };
  }

  verifyRefreshToken(token: string): { sub: string } | null {
    try {
      return this.jwtService.verify<{ sub: string }>(token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        algorithms: ['HS256'],
      });
    } catch {
      return null;
    }
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  refreshTokenExpiresAt(): Date {
    const raw = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const ms = parseDuration(raw);
    return new Date(Date.now() + ms);
  }
}

function parseDuration(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error(`Invalid duration format: "${value}". Use \\d+[smhd] (e.g. 15m, 7d).`);
  const n = parseInt(match[1], 10);
  const unit = match[2];
  const factors: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return n * factors[unit];
}
