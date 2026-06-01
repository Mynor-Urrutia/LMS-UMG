import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPasswordHasher, PASSWORD_HASHER } from '../../domain/ports/password-hasher.port';
import { AUTH_USER_REPOSITORY, IAuthUserRepository } from '../../domain/ports/user-repository.port';

@Injectable()
export class AdminResetPasswordUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY) private readonly userRepo: IAuthUserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: IPasswordHasher,
  ) {}

  async execute(targetUserId: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findById(targetUserId);
    if (!user) throw new NotFoundException('User not found');
    const newHash = await this.hasher.hash(newPassword);
    await this.userRepo.updatePasswordAndRevokeSessions(targetUserId, newHash);
  }
}
