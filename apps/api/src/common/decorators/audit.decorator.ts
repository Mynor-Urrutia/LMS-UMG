import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

export interface AuditMetadata {
  action: string;
  entityType: string;
  entityIdParam?: string;
}

export const Audit = (action: string, entityType: string, entityIdParam?: string) =>
  SetMetadata(AUDIT_KEY, { action, entityType, entityIdParam } satisfies AuditMetadata);
