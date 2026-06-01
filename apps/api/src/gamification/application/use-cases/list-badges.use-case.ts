import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { IBadgeRepository, BADGE_REPOSITORY, IBadgeFilters } from '../../domain/ports/badge-repository.port';
import { BadgeEntity } from '../../domain/entities/badge.entity';
import { BadgeCriteria } from '../../../common/enums/badge-criteria.enum';

const CUID_REGEX = /^c[a-z0-9]{24}$/;

@Injectable()
export class ListBadgesUseCase {
  constructor(@Inject(BADGE_REPOSITORY) private readonly badgeRepo: IBadgeRepository) {}

  async execute(courseId?: string, criteriaType?: string): Promise<BadgeEntity[]> {
    const filters: IBadgeFilters = {};
    if (courseId !== undefined) {
      if (!CUID_REGEX.test(courseId)) throw new BadRequestException('courseId must be a valid CUID');
      filters.courseId = courseId;
    }
    if (criteriaType !== undefined) {
      if (!Object.values(BadgeCriteria).includes(criteriaType as BadgeCriteria)) {
        throw new BadRequestException(`criteriaType must be one of: ${Object.values(BadgeCriteria).join(', ')}`);
      }
      filters.criteriaType = criteriaType as BadgeCriteria;
    }
    return this.badgeRepo.findAll(Object.keys(filters).length ? filters : undefined);
  }
}
