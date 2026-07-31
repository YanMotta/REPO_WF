export enum NotificationType {
  DEPENDENCY_RELEASED = 'DEPENDENCY_RELEASED',
  APPROACHING_DEADLINE = 'APPROACHING_DEADLINE',
  BECAME_LATE = 'BECAME_LATE',
  ASSIGNEE_CHANGED = 'ASSIGNEE_CHANGED',
}

export enum NotificationChannel {
  CONSOLE = 'CONSOLE',
  SMTP = 'SMTP',
}

export enum NotificationStatus {
  SENT = 'SENT',
  FAILED = 'FAILED',
}
