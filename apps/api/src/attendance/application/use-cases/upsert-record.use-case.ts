import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COURSE_REPOSITORY, ICourseRepository } from '../../../courses/domain/ports/course-repository.port';
import { ATTENDANCE_REPOSITORY, IAttendanceRepository } from '../../domain/ports/attendance-repository.port';
import { AttendanceRecordEntity } from '../../domain/entities/attendance.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UpsertRecordDto } from '../dtos/upsert-record.dto';

@Injectable()
export class UpsertRecordUseCase {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly attendanceRepo: IAttendanceRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
  ) {}

  async execute(
    courseId: string,
    sessionId: string,
    dto: UpsertRecordDto,
    actorId: string,
    actorRole: UserRole,
  ): Promise<AttendanceRecordEntity> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');
    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not teach this course');
    }
    const session = await this.attendanceRepo.findSessionById(sessionId);
    if (!session || session.courseId !== courseId) throw new NotFoundException('Session not found');
    return this.attendanceRepo.upsertRecord(sessionId, dto.studentId, dto.status);
  }
}
