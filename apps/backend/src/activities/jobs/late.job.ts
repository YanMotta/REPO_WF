import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ActivitiesService } from '../activities.service';

/**
 * Every minute: overdue activities (deadline < now, not DONE/LATE) become LATE; activities
 * already LATE have exceededHours recomputed so it stays "live" until completion.
 */
@Injectable()
export class LateJob {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron(): Promise<void> {
    const now = new Date();

    const overdue = await this.activitiesService.findOverdueNotLate(now);
    for (const activity of overdue) {
      await this.activitiesService.markLate(activity.id);
    }

    const lateActivities = await this.activitiesService.findAllLate();
    for (const activity of lateActivities) {
      await this.activitiesService.recomputeExceededHoursLive(activity.id);
    }
  }
}
