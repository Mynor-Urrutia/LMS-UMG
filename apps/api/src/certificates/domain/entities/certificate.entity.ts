export interface CertificateEntity {
  id: string;
  studentId: string;
  courseId: string;
  certificateNumber: string;
  issuedAt: Date;
  student?: { id: string; firstName: string; lastName: string } | null;
  course?: { id: string; title: string } | null;
}
