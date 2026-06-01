import { ConflictException, Injectable } from '@nestjs/common';
import { CustomRoleRepositoryPort } from '../../domain/ports/custom-role-repository.port';
import { CreateCustomRoleDto } from '../dtos/create-custom-role.dto';

@Injectable()
export class CreateCustomRoleUseCase {
  constructor(private readonly repo: CustomRoleRepositoryPort) {}

  async execute(dto: CreateCustomRoleDto) {
    const existing = await this.repo.findAll();
    if (existing.some(r => r.name.toLowerCase() === dto.name.toLowerCase())) {
      throw new ConflictException(`Role "${dto.name}" already exists`);
    }

    return this.repo.create({
      name: dto.name,
      description: dto.description,
      baseRole: dto.baseRole,
      color: dto.color,
      icon: dto.icon,
      permissionKeys: dto.permissionKeys,
    });
  }
}
