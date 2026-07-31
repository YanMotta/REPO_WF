import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '@workflow-brasal/shared';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('notification_logs')
export class NotificationLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  type: NotificationType;

  @Column({ type: 'varchar' })
  channel: NotificationChannel;

  @Column()
  recipientId: number;

  @Column()
  activityId: number;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar' })
  status: NotificationStatus;

  @CreateDateColumn({ type: 'datetime' })
  sentAt: Date;
}
