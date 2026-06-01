import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { UserRole } from '../../../common/enums/user-role.enum';

export interface GradeExportInput {
  courseId: string;
  actorId: string;
  actorRole: UserRole;
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

@Injectable()
export class GradeExportService {
  constructor(private readonly prisma: PrismaService) {}

  async buildCsv(input: GradeExportInput): Promise<string> {
    const course = await this.prisma.course.findUnique({
      where: { id: input.courseId },
      select: { id: true, title: true, teacherId: true },
    });
    if (!course) throw new NotFoundException('Course not found');

    const isOwner = course.teacherId === input.actorId;
    if (input.actorRole !== UserRole.ADMIN && !isOwner) {
      throw new ForbiddenException('Only the course owner or an admin can export grades');
    }

    const rows = await this.prisma.submission.findMany({
      where: { assignment: { courseId: input.courseId } },
      select: {
        id: true,
        submittedAt: true,
        student: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
        assignment: { select: { title: true, type: true, maxScore: true } },
        grade: { select: { score: true, gradedAt: true } },
      },
      orderBy: [{ assignment: { title: 'asc' } }, { student: { email: 'asc' } }],
    });

    const header = 'studentId,firstName,lastName,email,assignmentTitle,assignmentType,score,maxScore,percentage,submittedAt,gradedAt';
    const lines = rows.map((r) => {
      const score = r.grade?.score ?? null;
      const maxScore = r.assignment.maxScore;
      const pct = score !== null ? Math.round((score / maxScore) * 100) : null;
      return [
        r.student.id,
        r.student.profile?.firstName ?? '',
        r.student.profile?.lastName ?? '',
        r.student.email,
        r.assignment.title,
        r.assignment.type,
        score,
        maxScore,
        pct !== null ? `${pct}%` : '',
        r.submittedAt.toISOString(),
        r.grade?.gradedAt?.toISOString() ?? '',
      ].map(escapeCsv).join(',');
    });

    return [header, ...lines].join('\r\n');
  }
}
