import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditLogController } from './audit-log.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AuditLogController],
})
export class AuditLogModule {}
