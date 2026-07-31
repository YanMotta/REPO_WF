import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '@workflow-brasal/shared';
import { ActivitiesService } from '../../activities/activities.service';
import { ActivityAssigneeChangedPayload, DomainEvent } from '../../common/events/domain-events';
import { NotificationsService } from '../notifications.service';

@Injectable()
export class AssigneeChangedListener {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  @OnEvent(DomainEvent.ActivityAssigneeChanged)
  async handle(payload: ActivityAssigneeChangedPayload): Promise<void> {
    if (!payload.newResponsibleId) return;

    const activity = await this.activitiesService.findById(payload.activityId);
    await this.notificationsService.dispatch(
      NotificationType.ASSIGNEE_CHANGED,
      payload.newResponsibleId,
      activity.id,
      `Você foi designado: ${activity.title}`,
      `Você agora é o responsável pela atividade "${activity.title}".`,
    );
  }
}
