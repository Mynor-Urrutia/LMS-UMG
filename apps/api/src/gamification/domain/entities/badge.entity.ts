import { BadgeCriteria } from '../../../common/enums/badge-criteria.enum';

export { BadgeCriteria };

export interface BadgeEntity {
  id: string;
  courseId: string | null;
  name: string;
  description: string | null;
  iconPath: string | null;
  criteriaType: BadgeCriteria;
  createdAt: Date;
}
