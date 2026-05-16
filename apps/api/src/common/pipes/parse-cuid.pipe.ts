import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

// CUID v1: 'c' prefix + 24 lowercase alphanumeric chars (Prisma @default(cuid()))
const CUID_RE = /^c[a-z0-9]{24}$/;

@Injectable()
export class ParseCuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!CUID_RE.test(value)) {
      throw new BadRequestException('Invalid id format');
    }
    return value;
  }
}
