import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/ports/user-repository.port';
import { UpdateProfileDto } from '../dtos/update-profile.dto';
import { UserEntity } from '../../domain/entities/user.entity';

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(userId: string, dto: UpdateProfileDto): Promise<UserEntity> {
    const hasChanges = dto.firstName !== undefined || dto.lastName !== undefined ||
      dto.bio !== undefined || dto.carnet !== undefined ||
      dto.gradeId !== undefined || dto.sectionId !== undefined || dto.departmentId !== undefined;

    if (!hasChanges) {
      const current = await this.userRepo.findById(userId);
      if (!current) throw new NotFoundException('User not found');
      return current;
    }

    return this.userRepo.upsertProfile(userId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      bio: dto.bio,
      carnet: dto.carnet,
      gradeId: dto.gradeId,
      sectionId: dto.sectionId,
      departmentId: dto.departmentId,
    });
  }
}
