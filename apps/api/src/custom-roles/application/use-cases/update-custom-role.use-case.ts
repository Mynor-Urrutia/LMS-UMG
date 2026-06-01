import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomRoleRepositoryPort } from '../../domain/ports/custom-role-repository.port';
import { UpdateCustomRoleDto } from '../dtos/update-custom-role.dto';

@Injectable()
export class UpdateCustomRoleUseCase {
  constructor(private readonly repo: CustomRoleRepositoryPort) {}

  async execute(id: string, dto: UpdateCustomRoleDto) {
    const role = await this.repo.findById(id);
    if (!role) throw new NotFoundException('Custom role not found');

    if (role.isSystem && dto.name !== undefined && dto.name !== role.name) {
      throw new BadRequestException('Cannot rename a system role');
    }

    return this.repo.update(id, {
      name: dto.name,
      description: dto.description,
      color: dto.color,
      icon: dto.icon,
      permissionKeys: dto.permissionKeys,
    });
  }
}
