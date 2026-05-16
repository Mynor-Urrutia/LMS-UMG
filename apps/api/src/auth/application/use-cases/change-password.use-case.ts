import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { IPasswordHasher, PASSWORD_HASHER } from '../../domain/ports/password-hasher.port';
import { AUTH_USER_REPOSITORY, IAuthUserRepository } from '../../domain/ports/user-repository.port';

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY) private readonly userRepo: IAuthUserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: IPasswordHasher,
  ) {}

  async execute(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException();
    }
    const valid = await this.hasher.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const newHash = await this.hasher.hash(dto.newPassword);
    await this.userRepo.updatePasswordAndRevokeSessions(userId, newHash);
  }
}
