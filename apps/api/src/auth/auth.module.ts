import { Module } from '@nestjs/common';

import { PrismaModule } from '../common/prisma/prisma.module';
import { CommonModule } from '../common/modules/common.module';
import { CustomRolesModule } from '../custom-roles/custom-roles.module';

import { PASSWORD_HASHER } from './domain/ports/password-hasher.port';
import { TOKEN_SERVICE } from './domain/ports/token-service.port';
import { AUTH_USER_REPOSITORY } from './domain/ports/user-repository.port';

import { BcryptHasherAdapter } from './infrastructure/adapters/bcrypt-hasher.adapter';
import { JwtTokenAdapter } from './infrastructure/adapters/jwt-token.adapter';
import { PrismaUserAdapter } from './infrastructure/adapters/prisma-user.adapter';

import { RegisterUseCase } from './application/use-cases/register.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case';
import { AdminResetPasswordUseCase } from './application/use-cases/admin-reset-password.use-case';

import { AuthController } from './infrastructure/http/auth.controller';

@Module({
  imports: [PrismaModule, CommonModule, CustomRolesModule],
  controllers: [AuthController],
  providers: [
    // Port bindings
    { provide: PASSWORD_HASHER, useClass: BcryptHasherAdapter },
    { provide: TOKEN_SERVICE, useClass: JwtTokenAdapter },
    { provide: AUTH_USER_REPOSITORY, useClass: PrismaUserAdapter },
    // Use cases
    RegisterUseCase,
    LoginUseCase,
    LogoutUseCase,
    RefreshTokenUseCase,
    ChangePasswordUseCase,
    AdminResetPasswordUseCase,
  ],
})
export class AuthModule {}
