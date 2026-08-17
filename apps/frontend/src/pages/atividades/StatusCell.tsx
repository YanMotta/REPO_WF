import { Badge, Select } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ActivityStatus, Role, SYSTEM_ONLY_STATUSES } from '@workflow-brasal/shared';
import { changeActivityStatus } from '../../api/activities';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { KANBAN_COLUMNS, STATUS_COLOR, STATUS_LABEL } from '../../constants/status';

interface StatusCellProps {
  activityId: number;
  status: ActivityStatus;
  responsibleId: number | null;
  coResponsibleId: number | null;
}

/** Same manual-status options and DONE confirmation as the Kanban board — this is a second entry
 * point to the same PATCH /activities/:id/status, not a parallel rule set. READY_TO_START/LATE
 * are system-only, so they're only offered when they're already the current status (kept visible,
 * not selectable-into). */
export function StatusCell({ activityId, status, responsibleId, coResponsibleId }: StatusCellProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === Role.ADMIN;
  const canEdit = isAdmin || user?.id === responsibleId || user?.id === coResponsibleId;

  const mutation = useMutation({
    mutationFn: (newStatus: ActivityStatus) => changeActivityStatus(activityId, newStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activities'] }),
    onError: (err: unknown) => {
      notifications.show({
        color: 'red',
        title: 'Não foi possível mudar o status',
        message: err instanceof ApiError ? err.message : 'Erro inesperado',
      });
    },
  });

  if (!canEdit) {
    return <Badge color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Badge>;
  }

  const options = KANBAN_COLUMNS.filter((s) => !SYSTEM_ONLY_STATUSES.has(s) || s === status).map((s) => ({
    value: s,
    label: STATUS_LABEL[s],
  }));

  function handleChange(value: string | null) {
    if (!value || value === status) return;
    const newStatus = value as ActivityStatus;
    if (newStatus === ActivityStatus.DONE) {
      const confirmed = window.confirm(
        'Confirma a conclusão desta atividade? Ela será marcada como Concluída (ou Atrasada, se o horário limite já tiver passado).',
      );
      if (!confirmed) return;
    }
    mutation.mutate(newStatus);
  }

  return (
    <Select
      data={options}
      value={status}
      onChange={handleChange}
      disabled={mutation.isPending}
      allowDeselect={false}
      w={160}
      comboboxProps={{ withinPortal: true }}
      styles={{ input: { color: `var(--mantine-color-${STATUS_COLOR[status]}-7)`, fontWeight: 600 } }}
    />
  );
}
