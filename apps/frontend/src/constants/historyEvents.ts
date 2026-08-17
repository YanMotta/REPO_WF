import { ActivityHistoryEventType } from '@workflow-brasal/shared';

export const HISTORY_EVENT_LABEL: Record<ActivityHistoryEventType, string> = {
  [ActivityHistoryEventType.CREATED]: 'Atividade criada',
  [ActivityHistoryEventType.STARTED]: 'Atividade iniciada',
  [ActivityHistoryEventType.ASSIGNEE_CHANGED]: 'Responsável alterado',
  [ActivityHistoryEventType.CO_RESPONSIBLE_CHANGED]: 'Co-responsável alterado',
  [ActivityHistoryEventType.STATUS_CHANGED]: 'Status alterado',
  [ActivityHistoryEventType.PROGRESS_UPDATED]: 'Andamento atualizado',
  [ActivityHistoryEventType.BECAME_LATE]: 'Ficou atrasada',
  [ActivityHistoryEventType.DEPENDENCY_RESOLVED]: 'Dependência resolvida',
  [ActivityHistoryEventType.COMPLETED]: 'Concluída',
};
