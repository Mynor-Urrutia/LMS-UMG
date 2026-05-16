import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/ports/user-repository.port';
import { UserRole } from '../../../../common/enums/user-role.enum';

@Injectable()
export class ChangeUserRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(adminId: string, targetId: string, role: UserRole): Promise<void> {
    if (adminId === targetId) {
      throw new BadRequestException('Cannot change your own role');
    }

    const user = await this.userRepo.findById(targetId);
    if (!user) throw new NotFoundException('User not found');

    // atomicChangeRole enforces the last-admin invariant in a serializable transaction
    const result = await this.userRepo.atomicChangeRole(targetId, role);
    if (result === 'last-admin-blocked') {
      throw new BadRequestException('Cannot demote the last admin');
    }
  }
}
