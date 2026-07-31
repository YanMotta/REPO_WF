import { Injectable, Logger } from '@nestjs/common';
import { NotificationPayload, NotificationSender } from '../notification-sender.interface';

/** Dev-default channel — just logs. Never throws. */
@Injectable()
export class ConsoleNotificationService implements NotificationSender {
  private readonly logger = new Logger(ConsoleNotificationService.name);

  async send(payload: NotificationPayload): Promise<void> {
    this.logger.log(
      `[notification -> ${payload.recipientEmail}] ${payload.subject}\n${payload.body}`,
    );
  }
}
