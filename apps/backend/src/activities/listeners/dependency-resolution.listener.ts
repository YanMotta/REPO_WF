import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityCompletedPayload, DomainEvent } from '../../common/events/domain-events';
import { ActivitiesService } from '../activities.service';

/**
 * When an activity completes, every BACKLOG activity that depended on it may now have all of its
 * dependencies resolved — this listener checks each dependent and promotes it to READY_TO_START.
 */
@Injectable()
export class DependencyResolutionListener {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @OnEvent(DomainEvent.ActivityCompleted)
  async handleActivityCompleted(payload: ActivityCompletedPayload): Promise<void> {
    const dependents = await this.activitiesService.findDependents(payload.activityId);
    for (const dependent of dependents) {
      await this.activitiesService.promoteIfDependenciesResolved(dependent.activityId);
    }
  }
}
