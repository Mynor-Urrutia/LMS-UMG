import { Injectable } from '@nestjs/common';
import { CustomRoleRepositoryPort } from '../../domain/ports/custom-role-repository.port';

@Injectable()
export class ListPermissionsUseCase {
  constructor(private readonly repo: CustomRoleRepositoryPort) {}

  execute() {
    return this.repo.listPermissions();
  }
}
