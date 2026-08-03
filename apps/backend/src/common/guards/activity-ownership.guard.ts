import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@workflow-brasal/shared';
import { ActivitiesService } from '../../activities/activities.service';

/** MEMBER/MANAGER users may only act on activities where they're the responsible or
 * co-responsible; ADMIN bypasses this check entirely. Reads the activity id from `:id`. */
@Injectable()
export class ActivityOwnershipGuard implements CanActivate {
  constructor(private readonly activitiesService: ActivitiesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (user?.role === Role.ADMIN) return true;

    const activityId = Number(request.params.id);
    const activity = await this.activitiesService.findById(activityId);
    if (activity.responsibleId === user.id || activity.coResponsibleId === user.id) return true;

    throw new ForbiddenException(
      'You can only modify activities you are responsible or co-responsible for',
    );
  }
}
