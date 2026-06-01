import { BadgeEntity } from './badge.entity';

export interface UserBadgeEntity {
  id: string;
  userId: string;
  badgeId: string;
  awardedAt: Date;
  badge: BadgeEntity;
}
