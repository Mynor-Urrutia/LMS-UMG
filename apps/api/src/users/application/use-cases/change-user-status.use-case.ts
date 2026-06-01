import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/ports/user-repository.port';
import { SettableUserStatus } from '../dtos/change-status.dto';
import { UserStatus } from '../../../common/enums/user-status.enum';

@Injectable()
export class ChangeUserStatusUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(adminId: string, targetId: string, status: SettableUserStatus): Promise<void> {
    if (adminId === targetId) {
      throw new BadRequestException('Cannot change your own status');
    }
    const user = await this.userRepo.findById(targetId);
    if (!user) throw new NotFoundException('User not found');
    // SettableUserStatus (ACTIVE|INACTIVE) is a valid subset of UserStatus — cast is safe
    await this.userRepo.changeStatus(targetId, status as unknown as UserStatus);
  }
}
