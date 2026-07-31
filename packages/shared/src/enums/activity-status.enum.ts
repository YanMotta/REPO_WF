export enum ActivityStatus {
  BACKLOG = 'BACKLOG',
  TO_DO = 'TO_DO',
  READY_TO_START = 'READY_TO_START',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  LATE = 'LATE',
}

/** Statuses the API forbids setting through a manual status-change request — the system alone assigns them. */
export const SYSTEM_ONLY_STATUSES: ReadonlySet<ActivityStatus> = new Set([
  ActivityStatus.READY_TO_START,
  ActivityStatus.LATE,
]);
