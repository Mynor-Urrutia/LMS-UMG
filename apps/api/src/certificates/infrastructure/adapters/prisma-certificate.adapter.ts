import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ICertificateRepository } from '../../domain/ports/certificate-repository.port';
import { CertificateEntity } from '../../domain/entities/certificate.entity';

const CERT_SELECT = {
  id: true,
  studentId: true,
  courseId: true,
  certificateNumber: true,
  issuedAt: true,
  student: {
    select: {
      profile: { select: { firstName: true, lastName: true } },
    },
  },
  course: {
    select: { id: true, title: true },
  },
} as const;

type CertRow = Prisma.CertificateGetPayload<{ select: typeof CERT_SELECT }>;

@Injectable()
export class PrismaCertificateAdapter implements ICertificateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByStudentAndCourse(studentId: string, courseId: string): Promise<CertificateEntity | null> {
    const row = await this.prisma.certificate.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
      select: CERT_SELECT,
    });
    return row ? this.toEntity(row) : null;
  }

  async create(studentId: string, courseId: string, certificateNumber: string): Promise<CertificateEntity> {
    const row = await this.prisma.certificate.create({
      data: { studentId, courseId, certificateNumber },
      select: CERT_SELECT,
    });
    return this.toEntity(row);
  }

  private toEntity(row: CertRow): CertificateEntity {
    return {
      id: row.id,
      studentId: row.studentId,
      courseId: row.courseId,
      certificateNumber: row.certificateNumber,
      issuedAt: row.issuedAt,
      student: {
        id: row.studentId,
        firstName: row.student?.profile?.firstName ?? '',
        lastName: row.student?.profile?.lastName ?? '',
      },
      course: row.course ?? null,
    };
  }
}
