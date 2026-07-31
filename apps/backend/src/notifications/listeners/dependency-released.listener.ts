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
    if (!activity.responsibleId) return;

    await this.notificationsService.dispatch(
      NotificationType.DEPENDENCY_RELEASED,
      activity.responsibleId,
      activity.id,
      `Pronta para iniciar: ${activity.title}`,
      `Todas as dependências de "${activity.title}" foram concluídas — a atividade está pronta para iniciar.`,
    );
  }
}
