import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomRoleRepositoryPort } from '../../domain/ports/custom-role-repository.port';

@Injectable()
export class DeleteCustomRoleUseCase {
  constructor(private readonly repo: CustomRoleRepositoryPort) {}

  async execute(id: string) {
    const role = await this.repo.findById(id);
    if (!role) throw new NotFoundException('Custom role not found');
    if (role.isSystem) throw new BadRequestException('Cannot delete a system role');

    await this.repo.delete(id);
  }
}
