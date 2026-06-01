import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { IEmailService, ISendEmailInput } from '../../domain/ports/email-service.port';

@Injectable()
export class NodemailerEmailAdapter implements IEmailService {
  private readonly logger = new Logger(NodemailerEmailAdapter.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    if (!host) {
      this.transporter = null;
      this.from = '';
      return;
    }
    this.from = config.get<string>('SMTP_FROM', 'LMS <no-reply@lms.local>');
    this.transporter = nodemailer.createTransport({
      host,
      port: config.get<number>('SMTP_PORT', 587),
      auth: {
        user: config.get<string>('SMTP_USER'),
        pass: config.get<string>('SMTP_PASS'),
      },
    });
  }

  async send(input: ISendEmailInput): Promise<void> {
    if (!this.transporter) {
      this.logger.debug(`SMTP not configured — skipping email to ${input.to}: ${input.subject}`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to: input.to, subject: input.subject, html: input.html });
    } catch (err) {
      this.logger.error(`Failed to send email to ${input.to}: ${(err as Error).message}`);
    }
  }
}
