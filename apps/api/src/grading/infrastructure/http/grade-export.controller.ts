import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { JwtPayload, UserRole } from '../../../common/interfaces/jwt-payload.interface';
import { GradeExportService } from '../../application/services/grade-export.service';

@Controller('courses/:courseId/grades')
export class GradeExportController {
  constructor(private readonly gradeExport: GradeExportService) {}

  @Get('export')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async export(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @CurrentUser() actor: JwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.gradeExport.buildCsv({ courseId, actorId: actor.sub, actorRole: actor.role });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="grades-${courseId}.csv"`);
    res.send(csv);
  }
}
