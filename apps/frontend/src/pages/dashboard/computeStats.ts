import { ActivityDto, ActivityStatus, UserDto } from '@workflow-brasal/shared';
import { KANBAN_COLUMNS } from '../../constants/status';

export interface ResponsibleStats {
  responsibleId: number;
  name: string;
  total: number;
  done: number;
  completionRate: number;
  exceededHours: number;
}

export interface ActivityBottleneckStats {
  activityId: number;
  title: string;
  responsibleName: string;
  status: ActivityStatus;
  exceededHours: number;
}

export interface DashboardStats {
  lateCount: number;
  totalExceededHours: number;
  averageDelayHours: number;
  averageLeadTimeDays: number | null;
  completionRate: number;
  onTimeRate: number | null;
  statusCounts: Record<ActivityStatus, number>;
  byResponsible: ResponsibleStats[];
  bottlenecks: ActivityBottleneckStats[];
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function computeDashboardStats(activities: ActivityDto[], users: UserDto[]): DashboardStats {
  const userNameById = new Map(users.map((u) => [u.id, u.name]));

  const statusCounts = Object.fromEntries(
    KANBAN_COLUMNS.map((status) => [status, 0]),
  ) as Record<ActivityStatus, number>;
  activities.forEach((a) => {
    statusCounts[a.status] += 1;
  });

  const total = activities.length;
  const doneActivities = activities.filter((a) => a.status === ActivityStatus.DONE);
  const lateCount = statusCounts[ActivityStatus.LATE];

  const totalExceededHours = activities.reduce((sum, a) => sum + (a.exceededHours || 0), 0);
  const delayedActivities = activities.filter((a) => (a.exceededHours || 0) > 0);
  const averageDelayHours = average(delayedActivities.map((a) => a.exceededHours));

  const leadTimes = doneActivities
    .filter((a) => a.completionDate)
    .map((a) => {
      const created = new Date(a.createdAt).getTime();
      const completed = new Date(a.completionDate as string).getTime();
      return (completed - created) / (1000 * 60 * 60 * 24);
    });
  const averageLeadTimeDays = leadTimes.length > 0 ? average(leadTimes) : null;

  const completionRate = total > 0 ? (doneActivities.length / total) * 100 : 0;
  const onTimeCount = doneActivities.filter((a) => (a.exceededHours || 0) === 0).length;
  const onTimeRate = doneActivities.length > 0 ? (onTimeCount / doneActivities.length) * 100 : null;

  const byResponsibleMap = new Map<number, ResponsibleStats>();
  activities.forEach((a) => {
    if (!a.responsibleId) return;
    const entry =
      byResponsibleMap.get(a.responsibleId) ??
      ({
        responsibleId: a.responsibleId,
        name: userNameById.get(a.responsibleId) ?? `#${a.responsibleId}`,
        total: 0,
        done: 0,
        completionRate: 0,
        exceededHours: 0,
      } satisfies ResponsibleStats);
    entry.total += 1;
    if (a.status === ActivityStatus.DONE) entry.done += 1;
    entry.exceededHours += a.exceededHours || 0;
    byResponsibleMap.set(a.responsibleId, entry);
  });
  const byResponsible = Array.from(byResponsibleMap.values()).map((entry) => ({
    ...entry,
    completionRate: entry.total > 0 ? (entry.done / entry.total) * 100 : 0,
  }));

  // "Gargalos" — individual activities that are actually causing delays (late, or completed
  // late), not grouped by project since in practice there's only ever the one fixed checklist.
  const bottlenecks: ActivityBottleneckStats[] = activities
    .filter((a) => a.status === ActivityStatus.LATE || (a.exceededHours || 0) > 0)
    .map((a) => ({
      activityId: a.id,
      title: a.title,
      responsibleName: a.responsibleId ? (userNameById.get(a.responsibleId) ?? `#${a.responsibleId}`) : '—',
      status: a.status,
      exceededHours: a.exceededHours || 0,
    }))
    .sort((a, b) => b.exceededHours - a.exceededHours);

  return {
    lateCount,
    totalExceededHours,
    averageDelayHours,
    averageLeadTimeDays,
    completionRate,
    onTimeRate,
    statusCounts,
    byResponsible,
    bottlenecks,
  };
}
