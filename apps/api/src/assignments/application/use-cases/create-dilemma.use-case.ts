import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/ports/assignment-repository.port';
import { AssignmentType, DilemmaScenarioEntity } from '../../domain/entities/assignment.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { CreateDilemmaDto } from '../dtos/create-dilemma.dto';

@Injectable()
export class CreateDilemmaUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
  ) {}

  async execute(
    courseId: string,
    assignmentId: string,
    dto: CreateDilemmaDto,
    actorId: string,
    actorRole: UserRole,
  ): Promise<DilemmaScenarioEntity> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not own this course');
    }

    const assignment = await this.assignmentRepo.findById(assignmentId);
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.courseId !== courseId) throw new NotFoundException('Assignment does not belong to this course');
    if (assignment.type !== AssignmentType.DILEMMA) {
      throw new BadRequestException('Assignment must be of type DILEMMA to add a scenario');
    }

    const existing = await this.assignmentRepo.findDilemmaScenario(assignmentId);
    if (existing) throw new BadRequestException('A scenario already exists for this assignment — delete it first');

    if (dto.choices.length < 2) throw new BadRequestException('A dilemma must have at least 2 choices');

    return this.assignmentRepo.createDilemmaScenario({
      assignmentId,
      scenario: dto.scenario,
      choices: dto.choices,
    });
  }
}
