import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AUDIT_KEY, AuditMetadata } from '../decorators/audit.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();

    if (!MUTATING_METHODS.has(request.method)) {
      return next.handle();
    }

    const metadata = this.reflector.getAllAndOverride<AuditMetadata>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!metadata) {
      return next.handle();
    }

    if (!request.user) {
      this.logger.warn(
        { action: metadata.action, entityType: metadata.entityType, path: request.url },
        'Audit skipped: @Audit used on unauthenticated route',
      );
      return next.handle();
    }

    const { action, entityType } = metadata;

    const writeLog = (statusCode: number): void => {
      const params = request.params as Record<string, string>;
      const paramKey = metadata.entityIdParam ?? 'id';
      const entityId = params[paramKey] ?? (Object.keys(params)[0] ? params[Object.keys(params)[0]] : null);

      this.prisma.auditLog
        .create({
          data: {
            actorId: request.user?.sub ?? null,
            action,
            entityType,
            entityId,
            metadata: {
              method: request.method,
              path: request.url,
              statusCode,
            },
          },
        })
        .catch((err: unknown) => {
          this.logger.error(
            { error: err instanceof Error ? err.message : String(err) },
            'Audit log write failed',
          );
        });
    };

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          writeLog(response.statusCode);
        },
        error: (err: unknown) => {
          const statusCode =
            err instanceof Error && 'status' in err
              ? (err as { status: number }).status
              : 500;
          writeLog(statusCode);
        },
      }),
    );
  }
}
