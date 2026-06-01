import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const token = this.extractBearerToken(request);

    if (isPublic) {
      // Try to decode the token if present so @CurrentUser() works for role-based filtering,
      // but never reject the request — anonymous access is allowed on public routes.
      if (token) {
        try {
          request.user = this.jwtService.verify<JwtPayload>(token, {
            secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
            algorithms: ['HS256'],
          });
        } catch {
          // Expired or invalid token on a public route — ignore, treat as anonymous
        }
      }
      return true;
    }

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        algorithms: ['HS256'],
      });
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }

  private extractBearerToken(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;
    const [scheme, token] = authHeader.split(/\s+/);
    return scheme?.toLowerCase() === 'bearer' ? token : undefined;
  }
}
