import { Inject, Injectable } from '@nestjs/common';
import { IEnrollmentRepository, ENROLLMENT_REPOSITORY } from '../../domain/ports/enrollment-repository.port';
import { EnrollmentEntity } from '../../domain/entities/enrollment.entity';

@Injectable()
export class GetMyEnrollmentsUseCase {
  constructor(
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
  ) {}

  async execute(studentId: string): Promise<EnrollmentEntity[]> {
    return this.enrollmentRepo.findByStudent(studentId);
  }
}
