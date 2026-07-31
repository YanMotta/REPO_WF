export const DomainEvent = {
  ActivityCompleted: 'activity.completed',
  ActivityBecameLate: 'activity.becameLate',
  ActivityApproachingDeadline: 'activity.approachingDeadline',
  ActivityAssigneeChanged: 'activity.assigneeChanged',
  DependencyReleased: 'dependency.released',
} as const;

export interface ActivityCompletedPayload {
  activityId: number;
}

export interface ActivityBecameLatePayload {
  activityId: number;
}

export interface ActivityApproachingDeadlinePayload {
  activityId: number;
}

export interface ActivityAssigneeChangedPayload {
  activityId: number;
  oldResponsibleId: number | null;
  newResponsibleId: number | null;
}

export interface DependencyReleasedPayload {
  activityId: number;
}
