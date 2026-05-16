import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX = 100; // matches CreateCategoryDto @MaxLength(100) — slug can never be longer than source name

@Injectable()
export class ParseSlugPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (value.length > SLUG_MAX || !SLUG_RE.test(value)) {
      throw new BadRequestException('Invalid slug format');
    }
    return value;
  }
}
