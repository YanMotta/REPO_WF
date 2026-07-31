export interface NotificationPayload {
  recipientId: number;
  recipientEmail: string;
  subject: string;
  body: string;
}

/**
 * Swappable delivery mechanism. Named `NotificationSender` (not `NotificationChannel`) to avoid
 * colliding with the `NotificationChannel` enum (CONSOLE/SMTP) from @workflow-brasal/shared.
 */
export interface NotificationSender {
  send(payload: NotificationPayload): Promise<void>;
}
