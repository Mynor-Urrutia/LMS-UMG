import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import PDFDocument = require('pdfkit');
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { CreateModuleDto } from '../../application/dtos/create-module.dto';
import { UpdateModuleDto } from '../../application/dtos/update-module.dto';
import { ReorderModulesDto } from '../../application/dtos/reorder-modules.dto';
import { CreateCourseModuleUseCase } from '../../application/use-cases/create-course-module.use-case';
import { ListCourseModulesUseCase } from '../../application/use-cases/list-course-modules.use-case';
import { UpdateCourseModuleUseCase } from '../../application/use-cases/update-course-module.use-case';
import { ReorderCourseModulesUseCase } from '../../application/use-cases/reorder-course-modules.use-case';
import { DeleteCourseModuleUseCase } from '../../application/use-cases/delete-course-module.use-case';
import { GetModulePdfUseCase, ModulePdfData } from '../../application/use-cases/get-module-pdf.use-case';

@ApiTags('course-modules')
@Controller('courses/:courseId/modules')
export class CourseModulesController {
  constructor(
    private readonly createModuleUseCase: CreateCourseModuleUseCase,
    private readonly listModulesUseCase: ListCourseModulesUseCase,
    private readonly updateModuleUseCase: UpdateCourseModuleUseCase,
    private readonly reorderModulesUseCase: ReorderCourseModulesUseCase,
    private readonly deleteModuleUseCase: DeleteCourseModuleUseCase,
    private readonly getModulePdfUseCase: GetModulePdfUseCase,
  ) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a module to a course' })
  create(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Body() dto: CreateModuleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createModuleUseCase.execute(courseId, dto, user.sub, user.role);
  }

  @Get()
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List course modules with lesson summaries' })
  listAll(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listModulesUseCase.execute(courseId, user.sub, user.role);
  }

  // Static 'reorder' segment must be declared before ':moduleId' to avoid being matched as a CUID param
  @Patch('reorder')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder all modules for a course (full list required)' })
  async reorder(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Body() dto: ReorderModulesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.reorderModulesUseCase.execute(courseId, dto, user.sub, user.role);
  }

  @Patch(':moduleId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update module title' })
  update(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('moduleId', ParseCuidPipe) moduleId: string,
    @Body() dto: UpdateModuleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.updateModuleUseCase.execute(courseId, moduleId, dto, user.sub, user.role);
  }

  @Delete(':moduleId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a module and all its lessons' })
  async remove(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('moduleId', ParseCuidPipe) moduleId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.deleteModuleUseCase.execute(courseId, moduleId, user.sub, user.role);
  }

  @Get(':moduleId/pdf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Download module content as PDF' })
  async downloadPdf(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('moduleId', ParseCuidPipe) moduleId: string,
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.getModulePdfUseCase.execute(courseId, moduleId);
    this.streamPdf(data, res);
  }

  private streamPdf(data: ModulePdfData, res: Response): void {
    const TYPE_LABEL: Record<string, string> = {
      TEXT: 'Texto', VIDEO: 'Video', FILE: 'Archivo', EMBED: 'App embebida',
      INFOGRAPHIC: 'Infografía', CASE_STUDY: 'Caso de Estudio',
    };
    const filename = `modulo-${data.moduleOrder}-${data.moduleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const W = doc.page.width;
    const INNER = W - 100;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // ── Header band ───────────────────────────────────────────────────────────
    doc.rect(0, 0, W, 70).fill('#1e3a8a');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
      .text('MATERIAL DE ESTUDIO — USO INTERNO', 50, 16, { width: INNER });
    doc.fillColor('#bfdbfe').font('Helvetica').fontSize(9)
      .text(data.courseTitle, 50, 34, { width: INNER });

    // ── Module title ──────────────────────────────────────────────────────────
    doc.moveDown(3);
    doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(18)
      .text(`Módulo ${data.moduleOrder}`, 50, 90);
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(14)
      .text(data.moduleTitle, 50, 112, { width: INNER });
    doc.moveTo(50, doc.y + 6).lineTo(545, doc.y + 6).lineWidth(1.5).strokeColor('#3b82f6').stroke();

    // ── Lessons ───────────────────────────────────────────────────────────────
    for (const lesson of data.lessons) {
      if (doc.y > 680) doc.addPage();
      doc.moveDown(1.2);

      // Lesson header
      doc.fillColor('#1e40af').font('Helvetica-Bold').fontSize(12)
        .text(`${lesson.order}. ${lesson.title}`, 50, doc.y, { width: INNER });

      // Type chip
      const typeLabel = TYPE_LABEL[lesson.type] ?? lesson.type;
      doc.fillColor('#6b7280').font('Helvetica').fontSize(8)
        .text(`Tipo: ${typeLabel}`, 50, doc.y + 2);
      doc.moveDown(0.4);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.5).strokeColor('#e5e7eb').stroke();
      doc.moveDown(0.4);

      // Content
      if (lesson.content) {
        const plain = lesson.content
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<\/li>/gi, '\n')
          .replace(/<\/h[1-6]>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
          .replace(/\n{3,}/g, '\n\n').trim();
        doc.fillColor('#374151').font('Helvetica').fontSize(10)
          .text(plain, 50, doc.y, { width: INNER, lineGap: 2 });
      }
      if (lesson.videoUrl) {
        doc.moveDown(0.3);
        doc.fillColor('#2563eb').font('Helvetica').fontSize(9)
          .text(`▶ Video: ${lesson.videoUrl}`, 50, doc.y, { width: INNER });
      }
      if (lesson.embedUrl) {
        doc.moveDown(0.3);
        doc.fillColor('#7c3aed').font('Helvetica').fontSize(9)
          .text(`🔗 App embebida: ${lesson.embedUrl}`, 50, doc.y, { width: INNER });
      }
      if (!lesson.content && !lesson.videoUrl && !lesson.embedUrl) {
        doc.fillColor('#9ca3af').font('Helvetica-Oblique').fontSize(9)
          .text('Recurso multimedia disponible en la plataforma.', 50, doc.y, { width: INNER });
      }
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const pages = (doc as any).bufferedPageRange?.() ?? { count: 1 };
    const pageCount = typeof pages === 'object' ? pages.count : 1;
    doc.fillColor('#9ca3af').font('Helvetica').fontSize(7)
      .text(
        `Generado el ${new Date().toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' })} · Material de uso interno · Pág. ${pageCount}`,
        50, doc.page.height - 30, { width: INNER, align: 'center' },
      );

    doc.end();
  }
}
