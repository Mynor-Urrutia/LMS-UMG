import { Inject, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { AUTH_USER_REPOSITORY, IAuthUserRepository } from '../../domain/ports/user-repository.port';
import { ITokenService, TOKEN_SERVICE, TokenPair } from '../../domain/ports/token-service.port';
import { UserRole } from '../../../common/interfaces/jwt-payload.interface';
import { CustomRoleRepositoryPort } from '../../../custom-roles/domain/ports/custom-role-repository.port';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY) private readonly userRepo: IAuthUserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    private readonly customRoleRepo: CustomRoleRepositoryPort,
  ) {}

  async execute(rawRefreshToken: string | undefined): Promise<TokenPair & { refreshTokenExpiresAt: Date }> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const payload = this.tokenService.verifyRefreshToken(rawRefreshToken);
    if (!payload) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Look up user BEFORE revoking old token — if this fails, the old token stays valid and client can retry
    let user;
    try {
      user = await this.userRepo.findById(payload.sub);
    } catch {
      throw new InternalServerErrorException('Service temporarily unavailable');
    }
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const permissions = await this.customRoleRepo.getPermissionsByUserId(user.id);

    // Generate new pair before the atomic DB operation so we have both hashes ready
    const pair = this.tokenService.generatePair({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      ...(user.customRoleId ? { customRoleId: user.customRoleId } : {}),
      ...(permissions.length > 0 ? { permissions } : {}),
    });
    const refreshTokenExpiresAt = this.tokenService.refreshTokenExpiresAt();
    const oldTokenHash = this.tokenService.hashToken(rawRefreshToken);
    const newTokenHash = this.tokenService.hashToken(pair.refreshToken);

    // Single transaction: revoke old token + store new token — fully atomic
    // JWT expiry was already verified above; null means token not found or already revoked
    let stored;
    try {
      stored = await this.userRepo.atomicRotateRefreshToken(oldTokenHash, newTokenHash, user.id, refreshTokenExpiresAt);
    } catch {
      throw new InternalServerErrorException('Service temporarily unavailable');
    }
    if (!stored) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    return { ...pair, refreshTokenExpiresAt };
  }
}
