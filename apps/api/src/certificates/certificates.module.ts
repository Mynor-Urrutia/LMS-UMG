import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { CERTIFICATE_REPOSITORY } from './domain/ports/certificate-repository.port';
import { PrismaCertificateAdapter } from './infrastructure/adapters/prisma-certificate.adapter';
import { IssueCertificateUseCase } from './application/use-cases/issue-certificate.use-case';
import { GetCertificateUseCase } from './application/use-cases/get-certificate.use-case';
import { CourseCompletedListener } from './application/listeners/course-completed.listener';
import { CertificatesController } from './infrastructure/http/certificates.controller';

@Module({
  imports: [PrismaModule, EnrollmentsModule],
  controllers: [CertificatesController],
  providers: [
    { provide: CERTIFICATE_REPOSITORY, useClass: PrismaCertificateAdapter },
    IssueCertificateUseCase,
    GetCertificateUseCase,
    CourseCompletedListener,
  ],
})
export class CertificatesModule {}
