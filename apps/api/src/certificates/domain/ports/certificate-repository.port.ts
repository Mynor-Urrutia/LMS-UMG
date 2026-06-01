import { CertificateEntity } from '../entities/certificate.entity';

export const CERTIFICATE_REPOSITORY = 'CERTIFICATE_REPOSITORY';

export interface ICertificateRepository {
  findByStudentAndCourse(studentId: string, courseId: string): Promise<CertificateEntity | null>;
  create(studentId: string, courseId: string, certificateNumber: string): Promise<CertificateEntity>;
}
