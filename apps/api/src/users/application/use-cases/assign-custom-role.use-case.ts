import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/ports/user-repository.port';

@Injectable()
export class AssignCustomRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(targetId: string, customRoleId: string | null): Promise<void> {
    const user = await this.userRepo.findById(targetId);
    if (!user) throw new NotFoundException('User not found');

    await this.userRepo.assignCustomRole(targetId, customRoleId);
  }
}
