import { CustomRole } from '../entities/custom-role.entity';
import { Permission } from '../entities/permission.entity';

export interface CreateCustomRoleData {
  name: string;
  description?: string;
  baseRole: string;
  color?: string;
  icon?: string;
  permissionKeys: string[];
}

export interface UpdateCustomRoleData {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  permissionKeys?: string[];
}

export abstract class CustomRoleRepositoryPort {
  abstract findAll(): Promise<CustomRole[]>;
  abstract findById(id: string): Promise<CustomRole | null>;
  abstract getPermissionsByUserId(userId: string): Promise<string[]>;
  abstract create(data: CreateCustomRoleData): Promise<CustomRole>;
  abstract update(id: string, data: UpdateCustomRoleData): Promise<CustomRole>;
  abstract delete(id: string): Promise<void>;
  abstract listPermissions(): Promise<Permission[]>;
}
