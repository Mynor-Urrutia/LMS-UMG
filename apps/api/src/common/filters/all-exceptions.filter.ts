import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = uuidv4();
    const timestamp = new Date().toISOString();
    const path = request.url;

    let statusCode: number;
    let message: string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        const msg = (exceptionResponse as Record<string, unknown>).message;
        message = Array.isArray(msg) ? msg.join('; ') : String(msg ?? exception.message);
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
    }

    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    if (statusCode >= 500) {
      this.logger.error(
        {
          requestId,
          method: request.method,
          path,
          statusCode,
          error: exception instanceof Error ? exception.message : String(exception),
          stack: exception instanceof Error ? exception.stack : undefined,
        },
        'Unhandled exception',
      );

      if (isProduction) {
        message = 'Internal server error';
      }
    } else {
      this.logger.warn(
        {
          requestId,
          method: request.method,
          path,
          statusCode,
          message,
        },
        'HTTP exception',
      );
    }

    response.status(statusCode).json({
      statusCode,
      message,
      requestId,
      timestamp,
      path,
    });
  }
}
