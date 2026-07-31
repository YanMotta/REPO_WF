import { ActivityPriority, ActivityStatus } from '../enums';

export interface ActivityDto {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  responsibleId: number | null;
  priority: ActivityPriority;
  status: ActivityStatus;
  startDate: string | null;
  deadline: string | null;
  businessDayOffset: number | null;
  dueDateRuleMonth: number | null;
  dueDateRuleYear: number | null;
  dueTime: string | null;
  templateId: number | null;
  completionDate: string | null;
  progressPercent: number;
  estimatedHours: number | null;
  actualHours: number | null;
  exceededHours: number;
  notes: string | null;
  createdAt: string;
}

export interface ActivityDependencyDto {
  id: number;
  activityId: number;
  dependsOnActivityId: number;
}
