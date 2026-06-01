import { BadgeCriteria } from '../../../common/enums/badge-criteria.enum';
import { BadgeEntity } from '../entities/badge.entity';
import { UserBadgeEntity } from '../entities/user-badge.entity';

export const BADGE_REPOSITORY = 'BADGE_REPOSITORY';

export interface ICreateBadgeData {
  courseId: string | null;
  name: string;
  description: string | null;
  iconPath: string | null;
  criteriaType: BadgeCriteria;
}

export interface IUpdateBadgeData {
  name?: string;
  description?: string | null;
  iconPath?: string | null;
  criteriaType?: BadgeCriteria;
  courseId?: string | null;
}

export interface IBadgeFilters {
  courseId?: string;
  criteriaType?: BadgeCriteria;
}

export interface IBadgeRepository {
  findById(id: string): Promise<BadgeEntity | null>;
  findAll(filters?: IBadgeFilters): Promise<BadgeEntity[]>;
  create(data: ICreateBadgeData): Promise<BadgeEntity>;
  update(id: string, data: IUpdateBadgeData): Promise<BadgeEntity>;
  delete(id: string): Promise<void>;

  findUserBadge(userId: string, badgeId: string): Promise<UserBadgeEntity | null>;
  awardToUser(userId: string, badgeId: string): Promise<UserBadgeEntity>;
  listUserBadges(userId: string): Promise<UserBadgeEntity[]>;
}
