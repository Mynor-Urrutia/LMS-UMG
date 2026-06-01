import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/ports/assignment-repository.port';
import { DilemmaScenarioEntity } from '../../domain/entities/assignment.entity';

@Injectable()
export class GetDilemmaUseCase {
  constructor(@Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository) {}

  async execute(assignmentId: string): Promise<DilemmaScenarioEntity> {
    const scenario = await this.assignmentRepo.findDilemmaScenario(assignmentId);
    if (!scenario) throw new NotFoundException('Dilemma scenario not found for this assignment');
    return scenario;
  }
}
