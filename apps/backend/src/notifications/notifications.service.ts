import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  NotificationChannel as NotificationChannelEnum,
  NotificationStatus,
  NotificationType,
} from '@workflow-brasal/shared';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { ConsoleNotificationService } from './channels/console-notification.service';
import { SmtpNotificationService } from './channels/smtp-notification.service';
import { NotificationLog } from './entities/notification-log.entity';
import { NotificationSender } from './notification-sender.interface';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationLog)
    private readonly logsRepository: Repository<NotificationLog>,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly consoleChannel: ConsoleNotificationService,
    private readonly smtpChannel: SmtpNotificationService,
  ) {}

  private resolveChannel(): { sender: NotificationSender; channel: NotificationChannelEnum } {
    const configured = this.configService.get<string>('NOTIFICATION_CHANNEL', 'console');
    return configured === 'smtp'
      ? { sender: this.smtpChannel, channel: NotificationChannelEnum.SMTP }
      : { sender: this.consoleChannel, channel: NotificationChannelEnum.CONSOLE };
  }

  /** Always persists a NotificationLog row, whether the send succeeds or fails — failures are
   * logged, never silently swallowed. */
  async dispatch(
    type: NotificationType,
    recipientId: number,
    activityId: number,
    subject: string,
    body: string,
  ): Promise<NotificationLog> {
    const { sender, channel } = this.resolveChannel();
    const recipient = await this.usersService.findById(recipientId);

    let status: NotificationStatus;
    try {
      await sender.send({ recipientId, recipientEmail: recipient.email, subject, body });
      status = NotificationStatus.SENT;
    } catch (err) {
      this.logger.error(`Notification dispatch failed (type=${type}, activityId=${activityId}): ${err}`);
      status = NotificationStatus.FAILED;
    }

    const log = this.logsRepository.create({
      type,
      channel,
      recipientId,
      activityId,
      subject,
      body,
      status,
    });
    return this.logsRepository.save(log);
  }

  /** Enforces "notify once per activity per recipient" for events like APPROACHING_DEADLINE. */
  async hasAlreadyNotified(
    activityId: number,
    type: NotificationType,
    recipientId: number,
  ): Promise<boolean> {
    const existing = await this.logsRepository.findOne({ where: { activityId, type, recipientId } });
    return !!existing;
  }
}
