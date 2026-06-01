import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ICertificateRepository, CERTIFICATE_REPOSITORY } from '../../domain/ports/certificate-repository.port';
import { IEnrollmentRepository, ENROLLMENT_REPOSITORY } from '../../../enrollments/domain/ports/enrollment-repository.port';
import { CertificateEntity } from '../../domain/entities/certificate.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { EnrollmentStatus } from '../../../enrollments/domain/entities/enrollment.entity';
import { IssueCertificateUseCase } from './issue-certificate.use-case';

export interface IGetCertificateInput {
  courseId: string;
  actorId: string;
  actorRole: UserRole;
}

@Injectable()
export class GetCertificateUseCase {
  constructor(
    @Inject(CERTIFICATE_REPOSITORY) private readonly certRepo: ICertificateRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
    private readonly issueCertificate: IssueCertificateUseCase,
  ) {}

  async execute(input: IGetCertificateInput): Promise<CertificateEntity> {
    const studentId = input.actorId;

    let cert = await this.certRepo.findByStudentAndCourse(studentId, input.courseId);

    if (!cert) {
      // Lazy issuance: handles the race condition where the async listener
      // hasn't finished yet, and also retroactively covers enrollments
      // completed before the certificate feature was added.
      const enrollment = await this.enrollmentRepo.findByStudentAndCourse(studentId, input.courseId);
      if (!enrollment || enrollment.status !== EnrollmentStatus.COMPLETED) {
        throw new ForbiddenException('Certificado no disponible — completá el curso primero');
      }
      cert = await this.issueCertificate.execute(studentId, input.courseId);
    }

    return cert;
  }
}
