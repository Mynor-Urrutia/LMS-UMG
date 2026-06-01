import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import PDFDocument = require('pdfkit');
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { JwtPayload, UserRole } from '../../../common/interfaces/jwt-payload.interface';
import { GetCertificateUseCase } from '../../application/use-cases/get-certificate.use-case';
import { CertificateEntity } from '../../domain/entities/certificate.entity';

@Controller('courses/:courseId/certificate')
export class CertificatesController {
  constructor(private readonly getCertificate: GetCertificateUseCase) {}

  @Get()
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN)
  async download(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @CurrentUser() actor: JwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    const cert = await this.getCertificate.execute({ courseId, actorId: actor.sub, actorRole: actor.role });
    this.streamPdf(cert, res);
  }

  private streamPdf(cert: CertificateEntity, res: Response): void {
    const studentName = cert.student
      ? `${cert.student.firstName} ${cert.student.lastName}`.trim()
      : 'Estudiante';
    const courseTitle = cert.course?.title ?? 'Curso';
    const issuedDate = cert.issuedAt.toLocaleDateString('es-GT', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    const W = doc.page.width;   // ~841.89 pt
    const H = doc.page.height;  // ~595.28 pt
    const PAD = 60;
    const filename = `certificado-${cert.certificateNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // ── Background ─────────────────────────────────────────────────────────────
    doc.rect(0, 0, W, H).fill('#f8fafc');

    // Header band (navy)
    doc.rect(0, 0, W, 88).fill('#1e3a8a');
    // Footer band (navy)
    doc.rect(0, H - 68, W, 68).fill('#1e3a8a');

    // Gold outer border
    doc.rect(14, 14, W - 28, H - 28).lineWidth(2.5).strokeColor('#b8860b').stroke();
    // Gold inner border (thinner)
    doc.rect(20, 20, W - 40, H - 40).lineWidth(0.7).strokeColor('#b8860b').stroke();

    // ── Header content ──────────────────────────────────────────────────────────
    doc
      .fillColor('#ffffff').font('Helvetica-Bold').fontSize(13)
      .text('PLATAFORMA LMS — SISTEMA DE GESTIÓN DE APRENDIZAJE', 0, 26, { align: 'center', width: W });
    doc
      .fillColor('#bfdbfe').font('Helvetica').fontSize(10)
      .text('Certificación Oficial de Finalización de Curso', 0, 48, { align: 'center', width: W });

    // ── Main content ────────────────────────────────────────────────────────────
    // "CERTIFICADO DE FINALIZACIÓN"
    doc
      .fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(30)
      .text('CERTIFICADO DE FINALIZACIÓN', PAD, 112, { align: 'center', width: W - PAD * 2 });

    // Gold separator below title
    const sep1Y = 154;
    doc.moveTo(W * 0.28, sep1Y).lineTo(W * 0.72, sep1Y).lineWidth(1.5).strokeColor('#b8860b').stroke();

    // "Se certifica que"
    doc
      .fillColor('#475569').font('Helvetica').fontSize(14)
      .text('Se certifica que', 0, 168, { align: 'center', width: W });

    // Student name (largest text)
    doc
      .fillColor('#0f172a').font('Helvetica-Bold').fontSize(38)
      .text(studentName, PAD, 190, { align: 'center', width: W - PAD * 2 });

    // Subtle underline beneath name
    const nameLineY = 240;
    doc.moveTo(W * 0.15, nameLineY).lineTo(W * 0.85, nameLineY).lineWidth(0.8).strokeColor('#cbd5e1').stroke();

    // "ha completado satisfactoriamente el curso"
    doc
      .fillColor('#475569').font('Helvetica').fontSize(14)
      .text('ha completado satisfactoriamente el curso', 0, 252, { align: 'center', width: W });

    // Course title
    doc
      .fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(24)
      .text(courseTitle, PAD, 276, { align: 'center', width: W - PAD * 2 });

    // Gold separator below course
    const sep2Y = 320;
    doc.moveTo(W * 0.28, sep2Y).lineTo(W * 0.72, sep2Y).lineWidth(1.5).strokeColor('#b8860b').stroke();

    // Tagline
    doc
      .fillColor('#94a3b8').font('Helvetica').fontSize(11)
      .text(
        'Otorgado por haber demostrado dedicación y compromiso en el proceso de aprendizaje.',
        PAD, 334,
        { align: 'center', width: W - PAD * 2 },
      );

    // ── Footer content ──────────────────────────────────────────────────────────
    doc
      .fillColor('#93c5fd').font('Helvetica').fontSize(10)
      .text(`Emitido el ${issuedDate}`, PAD, H - 50, { width: (W - PAD * 2) / 2 });
    doc
      .fillColor('#93c5fd').font('Helvetica').fontSize(10)
      .text(`N° ${cert.certificateNumber}`, PAD, H - 50, { align: 'right', width: W - PAD * 2 });

    doc.end();
  }
}
