import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientRustPanicError,
  Prisma.PrismaClientInitializationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = uuidv4();
    const timestamp = new Date().toISOString();
    const path = request.url;

    let statusCode: number;
    let message: string;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          statusCode = HttpStatus.CONFLICT;
          message = 'Resource already exists';
          break;
        case 'P2025':
          statusCode = HttpStatus.NOT_FOUND;
          message = 'Resource not found';
          break;
        case 'P2003':
          statusCode = HttpStatus.CONFLICT;
          message = 'Related resource not found or constraint violation';
          break;
        default:
          statusCode = HttpStatus.BAD_REQUEST;
          message = 'Database request error';
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
      message = 'Validation error';
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
    }

    this.logger.error(
      {
        requestId,
        method: request.method,
        path,
        statusCode,
        prismaCode:
          exception instanceof Prisma.PrismaClientKnownRequestError
            ? exception.code
            : undefined,
        error: exception instanceof Error ? exception.message : String(exception),
      },
      'Prisma exception',
    );

    response.status(statusCode).json({
      statusCode,
      message,
      requestId,
      timestamp,
      path,
    });
  }
}
