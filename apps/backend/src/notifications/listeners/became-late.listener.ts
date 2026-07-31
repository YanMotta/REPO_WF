import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '@workflow-brasal/shared';
import { ActivitiesService } from '../../activities/activities.service';
import { ActivityBecameLatePayload, DomainEvent } from '../../common/events/domain-events';
import { NotificationsService } from '../notifications.service';

@Injectable()
export class BecameLateListener {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  @OnEvent(DomainEvent.ActivityBecameLate)
  async handle(payload: ActivityBecameLatePayload): Promise<void> {
    const activity = await this.activitiesService.findById(payload.activityId);
    if (!activity.responsibleId) return;

    await this.notificationsService.dispatch(
      NotificationType.BECAME_LATE,
      activity.responsibleId,
      activity.id,
      `Atividade atrasada: ${activity.title}`,
      `A atividade "${activity.title}" está atrasada. Prazo: ${activity.deadline?.toISOString() ?? '—'}.`,
    );
  }
}
