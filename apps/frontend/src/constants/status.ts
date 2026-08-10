import { ActivityPriority, ActivityStatus } from '@workflow-brasal/shared';

export const STATUS_LABEL: Record<ActivityStatus, string> = {
  [ActivityStatus.BACKLOG]: 'Backlog',
  [ActivityStatus.TO_DO]: 'A Fazer',
  [ActivityStatus.READY_TO_START]: 'Pronta p/ Iniciar',
  [ActivityStatus.IN_PROGRESS]: 'Em Andamento',
  [ActivityStatus.DONE]: 'Concluído',
  [ActivityStatus.LATE]: 'Atrasado',
};

/** Semantic status colors per the Brasal design system: gray for not-started, blue for active,
 * green for done, red for late. */
export const STATUS_COLOR: Record<ActivityStatus, string> = {
  [ActivityStatus.BACKLOG]: 'gray',
  [ActivityStatus.TO_DO]: 'gray',
  [ActivityStatus.READY_TO_START]: 'blue',
  [ActivityStatus.IN_PROGRESS]: 'blue',
  [ActivityStatus.DONE]: 'green',
  [ActivityStatus.LATE]: 'red',
};

export const PRIORITY_LABEL: Record<ActivityPriority, string> = {
  [ActivityPriority.LOW]: 'Baixa',
  [ActivityPriority.MEDIUM]: 'Média',
  [ActivityPriority.HIGH]: 'Alta',
  [ActivityPriority.URGENT]: 'Urgente',
};

/** Priority never competes with STATUS_COLOR for the same visual channel (e.g. Gantt bar fill
 * stays status-colored; priority renders as a separate accent) — so this scale is deliberately
 * distinct from the status one. */
export const PRIORITY_COLOR: Record<ActivityPriority, string> = {
  [ActivityPriority.LOW]: 'gray',
  [ActivityPriority.MEDIUM]: 'blue',
  [ActivityPriority.HIGH]: 'orange',
  [ActivityPriority.URGENT]: 'workflow',
};

export const KANBAN_COLUMNS: ActivityStatus[] = [
  ActivityStatus.BACKLOG,
  ActivityStatus.TO_DO,
  ActivityStatus.READY_TO_START,
  ActivityStatus.IN_PROGRESS,
  ActivityStatus.DONE,
  ActivityStatus.LATE,
];
