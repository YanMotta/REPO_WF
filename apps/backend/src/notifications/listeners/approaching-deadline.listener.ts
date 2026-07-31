import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '@workflow-brasal/shared';
import { ActivitiesService } from '../../activities/activities.service';
import { ActivityApproachingDeadlinePayload, DomainEvent } from '../../common/events/domain-events';
import { NotificationsService } from '../notifications.service';

/**
 * ApproachingDeadlineJob emits on every qualifying cron tick — this listener is what actually
 * enforces "only once per activity", by checking NotificationLog before dispatching.
 */
@Injectable()
export class ApproachingDeadlineListener {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  @OnEvent(DomainEvent.ActivityApproachingDeadline)
  async handle(payload: ActivityApproachingDeadlinePayload): Promise<void> {
    const alreadyNotified = await this.notificationsService.hasAlreadyNotified(
      payload.activityId,
      NotificationType.APPROACHING_DEADLINE,
    );
    if (alreadyNotified) return;

    const activity = await this.activitiesService.findById(payload.activityId);
    if (!activity.responsibleId) return;

    await this.notificationsService.dispatch(
      NotificationType.APPROACHING_DEADLINE,
      activity.responsibleId,
      activity.id,
      `Prazo se aproximando: ${activity.title}`,
      `A atividade "${activity.title}" vence em ${activity.deadline?.toISOString() ?? '—'}.`,
    );
  }
}
