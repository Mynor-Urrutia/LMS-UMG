import { Inject, Injectable } from '@nestjs/common';
import { AUTH_USER_REPOSITORY, IAuthUserRepository } from '../../domain/ports/user-repository.port';
import { ITokenService, TOKEN_SERVICE } from '../../domain/ports/token-service.port';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY) private readonly userRepo: IAuthUserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
  ) {}

  async execute(refreshToken: string | undefined, userId: string): Promise<void> {
    if (!refreshToken) return;
    const tokenHash = this.tokenService.hashToken(refreshToken);
    await this.userRepo.revokeRefreshToken(tokenHash, userId);
  }
}
