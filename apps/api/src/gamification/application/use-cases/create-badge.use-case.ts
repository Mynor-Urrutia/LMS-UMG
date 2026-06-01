import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IBadgeRepository, BADGE_REPOSITORY, ICreateBadgeData } from '../../domain/ports/badge-repository.port';
import { BadgeEntity } from '../../domain/entities/badge.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { CreateBadgeDto } from '../dtos/create-badge.dto';

@Injectable()
export class CreateBadgeUseCase {
  constructor(@Inject(BADGE_REPOSITORY) private readonly badgeRepo: IBadgeRepository) {}

  async execute(dto: CreateBadgeDto, actorRole: UserRole): Promise<BadgeEntity> {
    if (actorRole !== UserRole.ADMIN) throw new ForbiddenException('Only admins can create badges');

    const data: ICreateBadgeData = {
      courseId: dto.courseId ?? null,
      name: dto.name,
      description: dto.description ?? null,
      iconPath: dto.iconPath ?? null,
      criteriaType: dto.criteriaType,
    };

    return this.badgeRepo.create(data);
  }
}
