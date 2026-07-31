import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ActivityApproachingDeadlinePayload, DomainEvent } from '../../common/events/domain-events';
import { ActivitiesService } from '../activities.service';

const DEFAULT_WINDOW_HOURS = 24;

/**
 * Every minute: emits activity.approachingDeadline for every not-done/not-late activity whose
 * deadline falls within APPROACHING_DEADLINE_WINDOW_HOURS from now. Emission happens on every
 * qualifying tick — the "only once per activity" guarantee is enforced downstream by the
 * notification listener checking NotificationLog before it dispatches.
 */
@Injectable()
export class ApproachingDeadlineJob {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron(): Promise<void> {
    const windowHours = Number(
      this.configService.get('APPROACHING_DEADLINE_WINDOW_HOURS', DEFAULT_WINDOW_HOURS),
    );
    const now = new Date();
    const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

    const approaching = await this.activitiesService.findApproachingDeadline(now, windowEnd);
    for (const activity of approaching) {
      const payload: ActivityApproachingDeadlinePayload = { activityId: activity.id };
      this.eventEmitter.emit(DomainEvent.ActivityApproachingDeadline, payload);
    }
  }
}
