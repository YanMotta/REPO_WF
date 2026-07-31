import { ActivityHistoryEventType } from '../enums';

export interface ActivityHistoryDto {
  id: number;
  activityId: number;
  eventType: ActivityHistoryEventType;
  oldValue: string | null;
  newValue: string | null;
  changedById: number | null;
  occurredAt: string;
}
