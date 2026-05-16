import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const userAgent = request.headers['user-agent'] ?? '';
    const ip = request.ip ?? '';
    const start = Date.now();

    this.logger.log({ method, url, userAgent, ip }, 'Incoming request');

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const statusCode = response.statusCode;
          const duration = Date.now() - start;
          this.logger.log({ method, url, statusCode, duration }, 'Request completed');
        },
        error: (err: unknown) => {
          const statusCode =
            err instanceof Error && 'status' in err
              ? (err as { status: number }).status
              : 500;
          const duration = Date.now() - start;
          this.logger.error({ method, url, statusCode, duration }, 'Request failed');
        },
      }),
    );
  }
}
