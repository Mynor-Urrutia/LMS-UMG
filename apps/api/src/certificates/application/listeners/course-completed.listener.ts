import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IssueCertificateUseCase } from '../use-cases/issue-certificate.use-case';

export interface CourseCompletedEvent {
  studentId: string;
  courseId: string;
}

@Injectable()
export class CourseCompletedListener {
  private readonly logger = new Logger(CourseCompletedListener.name);

  constructor(private readonly issueCertificate: IssueCertificateUseCase) {}

  @OnEvent('course.completed', { async: true })
  async handle(event: CourseCompletedEvent): Promise<void> {
    try {
      await this.issueCertificate.execute(event.studentId, event.courseId);
      this.logger.log(`Certificate issued for student=${event.studentId} course=${event.courseId}`);
    } catch (err) {
      this.logger.error(`Failed to issue certificate: ${(err as Error).message}`);
    }
  }
}
