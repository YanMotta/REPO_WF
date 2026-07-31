import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NotificationPayload, NotificationSender } from '../notification-sender.interface';

@Injectable()
export class SmtpNotificationService implements NotificationSender {
  constructor(private readonly configService: ConfigService) {}

  async send(payload: NotificationPayload): Promise<void> {
    const host = this.configService.get<string>('SMTP_HOST');
    if (!host) {
      throw new Error('SMTP_HOST is not configured — cannot send e-mail notifications');
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(this.configService.get('SMTP_PORT', 587)),
      auth: this.configService.get<string>('SMTP_USER')
        ? {
            user: this.configService.get<string>('SMTP_USER'),
            pass: this.configService.get<string>('SMTP_PASSWORD'),
          }
        : undefined,
    });

    await transporter.sendMail({
      from: this.configService.get<string>('SMTP_FROM', 'no-reply@brasal.local'),
      to: payload.recipientEmail,
      subject: payload.subject,
      text: payload.body,
    });
  }
}
