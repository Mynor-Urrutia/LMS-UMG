import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IBadgeRepository, BADGE_REPOSITORY } from '../../domain/ports/badge-repository.port';
import { BadgeEntity } from '../../domain/entities/badge.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UpdateBadgeDto } from '../dtos/update-badge.dto';

@Injectable()
export class UpdateBadgeUseCase {
  constructor(@Inject(BADGE_REPOSITORY) private readonly badgeRepo: IBadgeRepository) {}

  async execute(badgeId: string, dto: UpdateBadgeDto, actorRole: UserRole): Promise<BadgeEntity> {
    if (actorRole !== UserRole.ADMIN) throw new ForbiddenException('Only admins can update badges');

    if (
      dto.name === undefined &&
      dto.description === undefined &&
      dto.iconPath === undefined &&
      dto.criteriaType === undefined &&
      dto.courseId === undefined
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    const badge = await this.badgeRepo.findById(badgeId);
    if (!badge) throw new NotFoundException('Badge not found');

    return this.badgeRepo.update(badgeId, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.iconPath !== undefined && { iconPath: dto.iconPath }),
      ...(dto.criteriaType !== undefined && { criteriaType: dto.criteriaType }),
      ...(dto.courseId !== undefined && { courseId: dto.courseId }),
    });
  }
}
