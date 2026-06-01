import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IEnrollmentRepository, ENROLLMENT_REPOSITORY } from '../../domain/ports/enrollment-repository.port';
import { EnrollmentEntity, EnrollmentStatus } from '../../domain/entities/enrollment.entity';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AdminEnrollUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(courseId: string, studentId: string): Promise<EnrollmentEntity> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const student = await this.prisma.user.findUnique({ where: { id: studentId }, select: { id: true, role: true } });
    if (!student) throw new NotFoundException('Student not found');
    if (student.role !== 'STUDENT') throw new UnprocessableEntityException('User is not a student');

    const existing = await this.enrollmentRepo.findByStudentAndCourse(studentId, courseId);
    if (existing) {
      if (existing.status === EnrollmentStatus.ACTIVE) throw new ConflictException('Student is already enrolled');
      if (existing.status === EnrollmentStatus.COMPLETED) throw new ConflictException('Student already completed this course');
      // PENDING or REJECTED → promote to ACTIVE
      await this.enrollmentRepo.updateStatus(existing.id, EnrollmentStatus.ACTIVE);
      return { ...existing, status: EnrollmentStatus.ACTIVE };
    }

    const enrollment = await this.enrollmentRepo.create({ studentId, courseId, status: EnrollmentStatus.ACTIVE });
    this.eventEmitter.emit('enrollment.created', { studentId, courseId });
    return enrollment;
  }
}
