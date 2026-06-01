import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { USER_REPOSITORY } from './domain/ports/user-repository.port';
import { PrismaUsersAdapter } from './infrastructure/adapters/prisma-users.adapter';
import { GetProfileUseCase } from './application/use-cases/get-profile.use-case';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { ChangeUserRoleUseCase } from './application/use-cases/change-user-role.use-case';
import { ChangeUserStatusUseCase } from './application/use-cases/change-user-status.use-case';
import { AssignCustomRoleUseCase } from './application/use-cases/assign-custom-role.use-case';
import { UsersController } from './infrastructure/http/users.controller';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUsersAdapter },
    GetProfileUseCase,
    UpdateProfileUseCase,
    ListUsersUseCase,
    ChangeUserRoleUseCase,
    ChangeUserStatusUseCase,
    AssignCustomRoleUseCase,
  ],
})
export class UsersModule {}
