import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesModule } from '../activities/activities.module';
import { UsersModule } from '../users/users.module';
import { ConsoleNotificationService } from './channels/console-notification.service';
import { SmtpNotificationService } from './channels/smtp-notification.service';
import { NotificationLog } from './entities/notification-log.entity';
import { ApproachingDeadlineListener } from './listeners/approaching-deadline.listener';
import { AssigneeChangedListener } from './listeners/assignee-changed.listener';
import { BecameLateListener } from './listeners/became-late.listener';
import { DependencyReleasedListener } from './listeners/dependency-released.listener';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationLog]), UsersModule, ActivitiesModule],
  providers: [
    NotificationsService,
    ConsoleNotificationService,
    SmtpNotificationService,
    BecameLateListener,
    ApproachingDeadlineListener,
    AssigneeChangedListener,
    DependencyReleasedListener,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
