import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COURSE_REPOSITORY, ICourseRepository } from '../../../courses/domain/ports/course-repository.port';
import { ATTENDANCE_REPOSITORY, IAttendanceRepository, StudentAttendanceRecord } from '../../domain/ports/attendance-repository.port';
import { ENROLLMENT_REPOSITORY, IEnrollmentRepository } from '../../../enrollments/domain/ports/enrollment-repository.port';
import { EnrollmentStatus } from '../../../enrollments/domain/entities/enrollment.entity';

@Injectable()
export class GetStudentAttendanceUseCase {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly attendanceRepo: IAttendanceRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollRepo: IEnrollmentRepository,
  ) {}

  async execute(courseId: string, studentId: string): Promise<StudentAttendanceRecord[]> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');
    const enrollment = await this.enrollRepo.findByStudentAndCourse(studentId, courseId);
    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException('You must be enrolled in this course');
    }
    return this.attendanceRepo.getStudentAttendance(courseId, studentId);
  }
}
