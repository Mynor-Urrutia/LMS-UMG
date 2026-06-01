import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AcademicStructureController } from './academic-structure.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AcademicStructureController],
})
export class AcademicStructureModule {}
