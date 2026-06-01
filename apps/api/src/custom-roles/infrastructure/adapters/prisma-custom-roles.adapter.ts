import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CustomRoleRepositoryPort, CreateCustomRoleData, UpdateCustomRoleData } from '../../domain/ports/custom-role-repository.port';
import { CustomRole } from '../../domain/entities/custom-role.entity';
import { Permission } from '../../domain/entities/permission.entity';

const ROLE_SELECT = {
  id: true,
  name: true,
  description: true,
  baseRole: true,
  isSystem: true,
  color: true,
  icon: true,
  createdAt: true,
  permissions: {
    select: {
      permission: { select: { key: true } },
    },
  },
} as const;

function toEntity(raw: {
  id: string;
  name: string;
  description: string | null;
  baseRole: string;
  isSystem: boolean;
  color: string | null;
  icon: string | null;
  createdAt: Date;
  permissions: { permission: { key: string } }[];
}): CustomRole {
  return new CustomRole(
    raw.id,
    raw.name,
    raw.description,
    raw.baseRole,
    raw.isSystem,
    raw.color,
    raw.icon,
    raw.permissions.map(p => p.permission.key),
    raw.createdAt,
  );
}

@Injectable()
export class PrismaCustomRolesAdapter extends CustomRoleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAll(): Promise<CustomRole[]> {
    const rows = await this.prisma.customRole.findMany({
      select: ROLE_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toEntity);
  }

  async findById(id: string): Promise<CustomRole | null> {
    const row = await this.prisma.customRole.findUnique({
      where: { id },
      select: ROLE_SELECT,
    });
    return row ? toEntity(row) : null;
  }

  async getPermissionsByUserId(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        customRole: {
          select: {
            permissions: {
              select: { permission: { select: { key: true } } },
            },
          },
        },
      },
    });
    return user?.customRole?.permissions.map(p => p.permission.key) ?? [];
  }

  async create(data: CreateCustomRoleData): Promise<CustomRole> {
    const perms = await this.prisma.permission.findMany({
      where: { key: { in: data.permissionKeys } },
      select: { id: true },
    });

    const row = await this.prisma.customRole.create({
      data: {
        name: data.name,
        description: data.description,
        baseRole: data.baseRole as any,
        color: data.color,
        icon: data.icon,
        permissions: {
          create: perms.map(p => ({ permissionId: p.id })),
        },
      },
      select: ROLE_SELECT,
    });

    return toEntity(row);
  }

  async update(id: string, data: UpdateCustomRoleData): Promise<CustomRole> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon;

    if (data.permissionKeys !== undefined) {
      const perms = await this.prisma.permission.findMany({
        where: { key: { in: data.permissionKeys } },
        select: { id: true },
      });
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      updateData.permissions = {
        create: perms.map(p => ({ permissionId: p.id })),
      };
    }

    const row = await this.prisma.customRole.update({
      where: { id },
      data: updateData,
      select: ROLE_SELECT,
    });

    return toEntity(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.customRole.delete({ where: { id } });
  }

  async listPermissions(): Promise<Permission[]> {
    const rows = await this.prisma.permission.findMany({
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
    });
    return rows.map(r => new Permission(r.id, r.key, r.name, r.description, r.group));
  }
}
