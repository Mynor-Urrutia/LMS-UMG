import { Injectable } from '@nestjs/common';
import { CustomRoleRepositoryPort } from '../../domain/ports/custom-role-repository.port';

@Injectable()
export class ListCustomRolesUseCase {
  constructor(private readonly repo: CustomRoleRepositoryPort) {}

  execute() {
    return this.repo.findAll();
  }
}
