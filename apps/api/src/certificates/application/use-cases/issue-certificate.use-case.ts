import { Inject, Injectable, Logger } from '@nestjs/common';
import { ICertificateRepository, CERTIFICATE_REPOSITORY } from '../../domain/ports/certificate-repository.port';
import { CertificateEntity } from '../../domain/entities/certificate.entity';

function generateCertNumber(): string {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 8; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `CERT-${year}-${suffix}`;
}

@Injectable()
export class IssueCertificateUseCase {
  private readonly logger = new Logger(IssueCertificateUseCase.name);

  constructor(
    @Inject(CERTIFICATE_REPOSITORY) private readonly certRepo: ICertificateRepository,
  ) {}

  async execute(studentId: string, courseId: string): Promise<CertificateEntity> {
    const existing = await this.certRepo.findByStudentAndCourse(studentId, courseId);
    if (existing) return existing;

    let cert: CertificateEntity | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        cert = await this.certRepo.create(studentId, courseId, generateCertNumber());
        break;
      } catch {
        // Retry on certificateNumber collision (P2002) — astronomically rare
      }
    }
    if (!cert) {
      this.logger.error(`Failed to generate unique certificate number for student=${studentId} course=${courseId}`);
      throw new Error('Could not issue certificate after 5 attempts');
    }
    return cert;
  }
}
