import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  ISubmissionRepository,
  ICreateSubmissionData,
  IUpdateSubmissionData,
  SubmissionWithStudentInfo,
} from '../../domain/ports/submission-repository.port';
import { SubmissionEntity } from '../../domain/entities/submission.entity';

const SUBMISSION_SELECT = {
  id: true,
  studentId: true,
  assignmentId: true,
  textContent: true,
  filePath: true,
  fileAssetId: true,
  choiceId: true,
  isLate: true,
  submittedAt: true,
  updatedAt: true,
} as const;

type SubmissionRow = Prisma.SubmissionGetPayload<{ select: typeof SUBMISSION_SELECT }>;

function toEntity(row: SubmissionRow): SubmissionEntity {
  return {
    id: row.id,
    studentId: row.studentId,
    assignmentId: row.assignmentId,
    textContent: row.textContent,
    filePath: row.filePath,
    fileAssetId: row.fileAssetId,
    choiceId: row.choiceId,
    isLate: row.isLate,
    submittedAt: row.submittedAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PrismaSubmissionsAdapter implements ISubmissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<SubmissionEntity | null> {
    const row = await this.prisma.submission.findUnique({ where: { id }, select: SUBMISSION_SELECT });
    return row ? toEntity(row) : null;
  }

  async findByStudentAndAssignment(studentId: string, assignmentId: string): Promise<SubmissionEntity | null> {
    const row = await this.prisma.submission.findUnique({
      where: { studentId_assignmentId: { studentId, assignmentId } },
      select: {
        ...SUBMISSION_SELECT,
        grade: { select: { id: true, score: true, maxScore: true, feedback: true } },
      },
    });
    if (!row) return null;
    return { ...toEntity(row), grade: row.grade ?? null };
  }

  async findByAssignment(assignmentId: string): Promise<SubmissionEntity[]> {
    const rows = await this.prisma.submission.findMany({
      where: { assignmentId },
      select: SUBMISSION_SELECT,
      orderBy: { submittedAt: 'asc' },
    });
    return rows.map(toEntity);
  }

  async findByAssignmentWithStudents(assignmentId: string): Promise<SubmissionWithStudentInfo[]> {
    const rows = await this.prisma.submission.findMany({
      where: { assignmentId },
      select: {
        ...SUBMISSION_SELECT,
        student: {
          select: {
            email: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
        grade: { select: { id: true, score: true, maxScore: true, feedback: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });
    return rows.map(row => ({
      ...toEntity(row),
      studentFirstName: row.student.profile?.firstName ?? '',
      studentLastName: row.student.profile?.lastName ?? '',
      studentEmail: row.student.email,
      grade: row.grade ?? null,
    }));
  }

  async create(data: ICreateSubmissionData): Promise<SubmissionEntity> {
    try {
      const row = await this.prisma.submission.create({
        data: {
          studentId: data.studentId,
          assignmentId: data.assignmentId,
          textContent: data.textContent,
          fileAssetId: data.fileAssetId,
          choiceId: data.choiceId ?? null,
          isLate: data.isLate,
        },
        select: {
          ...SUBMISSION_SELECT,
          choice: { select: { id: true, text: true, consequence: true, ethicalScore: true } },
        },
      });
      return { ...toEntity(row), dilemmaChoice: (row as any).choice ?? null };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') throw new ConflictException('You have already submitted for this assignment');
        if (err.code === 'P2003') throw new NotFoundException('Assignment or file asset not found');
      }
      throw err;
    }
  }

  async update(id: string, data: IUpdateSubmissionData): Promise<SubmissionEntity> {
    try {
      const row = await this.prisma.submission.update({
        where: { id },
        data: {
          ...(data.textContent !== undefined && { textContent: data.textContent }),
          ...(data.fileAssetId !== undefined && { fileAssetId: data.fileAssetId }),
          ...(data.isLate !== undefined && { isLate: data.isLate }),
        },
        select: SUBMISSION_SELECT,
      });
      return toEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2025') throw new NotFoundException('Submission not found');
        if (err.code === 'P2003') throw new NotFoundException('File asset not found');
      }
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.submission.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Submission not found');
      }
      throw err;
    }
  }

  async hasGrade(submissionId: string): Promise<boolean> {
    const count = await this.prisma.grade.count({ where: { submissionId } });
    return count > 0;
  }
}
