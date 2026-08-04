import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '@workflow-brasal/shared';
import { ActivitiesService } from '../../activities/activities.service';
import { DependencyReleasedPayload, DomainEvent } from '../../common/events/domain-events';
import { NotificationsService } from '../notifications.service';

@Injectable()
export class DependencyReleasedListener {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  @OnEvent(DomainEvent.DependencyReleased)
  async handle(payload: DependencyReleasedPayload): Promise<void> {
    const activity = await this.activitiesService.findById(payload.activityId);
    const recipientIds = [activity.responsibleId, activity.coResponsibleId].filter(
      (id): id is number => id != null,
    );

    for (const recipientId of new Set(recipientIds)) {
      await this.notificationsService.dispatch(
        NotificationType.DEPENDENCY_RELEASED,
        recipientId,
        activity.id,
        `Pronta para iniciar: ${activity.title}`,
        `Todas as dependências de "${activity.title}" foram concluídas — a atividade está pronta para iniciar.`,
      );
    }
  }
}
