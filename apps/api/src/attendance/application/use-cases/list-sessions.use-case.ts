import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COURSE_REPOSITORY, ICourseRepository } from '../../../courses/domain/ports/course-repository.port';
import { ATTENDANCE_REPOSITORY, IAttendanceRepository } from '../../domain/ports/attendance-repository.port';
import { AttendanceSessionEntity } from '../../domain/entities/attendance.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class ListSessionsUseCase {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly attendanceRepo: IAttendanceRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
  ) {}

  async execute(courseId: string, actorId: string, actorRole: UserRole): Promise<AttendanceSessionEntity[]> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');
    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not teach this course');
    }
    return this.attendanceRepo.findSessionsByCourse(courseId);
  }
}
