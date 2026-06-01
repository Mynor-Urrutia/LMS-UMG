import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Extends ThrottlerGuard to automatically skip rate-limiting for safe
 * read-only HTTP methods (GET, HEAD, OPTIONS).
 *
 * Rationale: course pages fire 15-25 GET requests on load (modules,
 * lessons, assignments, evaluations, progress, forum, etc.). Counting
 * those against the write budget causes legitimate users to hit 429s
 * before they can perform any state-changing action. Writes (POST,
 * PATCH, PUT, DELETE) remain throttled normally.
 */
@Injectable()
export class SmartThrottleGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const parentSkip = await super.shouldSkip(context);
    if (parentSkip) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(req.method?.toUpperCase() ?? '');
    return safeMethod;
  }
}
