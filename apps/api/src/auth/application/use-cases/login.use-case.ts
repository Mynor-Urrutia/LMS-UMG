import { Inject, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from '../dtos/login.dto';
import { IPasswordHasher, PASSWORD_HASHER } from '../../domain/ports/password-hasher.port';
import { AUTH_USER_REPOSITORY, IAuthUserRepository } from '../../domain/ports/user-repository.port';
import { ITokenService, TOKEN_SERVICE, TokenPair } from '../../domain/ports/token-service.port';
import { UserRole } from '../../../common/interfaces/jwt-payload.interface';
import { CustomRoleRepositoryPort } from '../../../custom-roles/domain/ports/custom-role-repository.port';

export interface LoginResult extends TokenPair {
  user: { id: string; email: string; role: UserRole };
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class LoginUseCase implements OnModuleInit {
  private dummyHash!: string;

  constructor(
    @Inject(AUTH_USER_REPOSITORY) private readonly userRepo: IAuthUserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: IPasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    private readonly customRoleRepo: CustomRoleRepositoryPort,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.hasher.hash('__timing_dummy__');
  }

  async execute(dto: LoginDto): Promise<LoginResult> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user || user.status !== 'ACTIVE') {
      await this.hasher.compare(dto.password, this.dummyHash);
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await this.hasher.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const permissions = await this.customRoleRepo.getPermissionsByUserId(user.id);

    const pair = this.tokenService.generatePair({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      ...(user.customRoleId ? { customRoleId: user.customRoleId } : {}),
      ...(permissions.length > 0 ? { permissions } : {}),
    });
    const refreshTokenExpiresAt = this.tokenService.refreshTokenExpiresAt();
    const tokenHash = this.tokenService.hashToken(pair.refreshToken);
    await this.userRepo.storeRefreshToken(user.id, tokenHash, refreshTokenExpiresAt);
    return { ...pair, user: { id: user.id, email: user.email, role: user.role as UserRole }, refreshTokenExpiresAt };
  }
}
