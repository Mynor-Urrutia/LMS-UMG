import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CustomRoleRepositoryPort } from './domain/ports/custom-role-repository.port';
import { PrismaCustomRolesAdapter } from './infrastructure/adapters/prisma-custom-roles.adapter';
import { CustomRolesController } from './infrastructure/http/custom-roles.controller';
import { ListCustomRolesUseCase } from './application/use-cases/list-custom-roles.use-case';
import { ListPermissionsUseCase } from './application/use-cases/list-permissions.use-case';
import { CreateCustomRoleUseCase } from './application/use-cases/create-custom-role.use-case';
import { UpdateCustomRoleUseCase } from './application/use-cases/update-custom-role.use-case';
import { DeleteCustomRoleUseCase } from './application/use-cases/delete-custom-role.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [CustomRolesController],
  providers: [
    { provide: CustomRoleRepositoryPort, useClass: PrismaCustomRolesAdapter },
    ListCustomRolesUseCase,
    ListPermissionsUseCase,
    CreateCustomRoleUseCase,
    UpdateCustomRoleUseCase,
    DeleteCustomRoleUseCase,
  ],
  exports: [CustomRoleRepositoryPort],
})
export class CustomRolesModule {}
