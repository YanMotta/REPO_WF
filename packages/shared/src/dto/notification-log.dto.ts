import { NotificationChannel, NotificationStatus, NotificationType } from '../enums';

export interface NotificationLogDto {
  id: number;
  type: NotificationType;
  channel: NotificationChannel;
  recipientId: number;
  activityId: number;
  subject: string;
  body: string;
  status: NotificationStatus;
  sentAt: string;
}
