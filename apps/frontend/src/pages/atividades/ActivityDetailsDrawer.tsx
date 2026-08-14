import { Badge, Button, Drawer, Group, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconPencil } from '@tabler/icons-react';
import { ActivityDto, ActivityStatus, Role } from '@workflow-brasal/shared';
import { ReactNode, useEffect, useState } from 'react';
import { getActivity, getActivityDependencies, updateActivity, UpdateActivityInput } from '../../api/activities';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { STATUS_COLOR, STATUS_LABEL } from '../../constants/status';
import { formatBusinessDayRule, formatDate, formatTime } from '../../utils/format';
import { EditActivityModal } from './EditActivityModal';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text size="sm">{children}</Text>
    </div>
  );
}

function PredecessorTitle({ predecessorId }: { predecessorId: number }) {
  const { data } = useQuery({
    queryKey: ['activity', predecessorId],
    queryFn: () => getActivity(predecessorId),
  });
  return <>{data?.title ?? '…'}</>;
}

/** Only renders once dependencies resolve to a non-empty list — most activities have none,
 * and the Field's uppercase label would look odd sitting empty while waiting for the request. */
function PredecessorField({ activityId }: { activityId: number }) {
  const { data: dependencies } = useQuery({
    queryKey: ['activity-dependencies', activityId],
    queryFn: () => getActivityDependencies(activityId),
  });

  if (!dependencies || dependencies.length === 0) return null;

  return (
    <Field label="Predecessora">
      {dependencies.map((dep, index) => (
        <span key={dep.id}>
          {index > 0 && ', '}
          <PredecessorTitle predecessorId={dep.dependsOnActivityId} />
        </span>
      ))}
    </Field>
  );
}

/** Shared body used both by the side Drawer (Atividades/Gantt) and the Kanban hover popover —
 * one place for the field list so the two surfaces never drift apart. */
export function ActivityDetailsContent({
  activity,
  responsibleName,
  coResponsibleName,
}: {
  activity: ActivityDto;
  responsibleName: string;
  coResponsibleName: string | null;
}) {
  return (
    <Stack gap="md">
      <Text fw={700} size="lg">
        {activity.title}
      </Text>

      <Group>
        <Badge color={STATUS_COLOR[activity.status]}>{STATUS_LABEL[activity.status]}</Badge>
        <Badge variant="light" color="workflow">
          {formatBusinessDayRule(activity.businessDayOffset)}
        </Badge>
      </Group>

      {activity.description && <Field label="Descrição">{activity.description}</Field>}

      <Field label="Responsável">{responsibleName}</Field>
      {coResponsibleName && <Field label="Co-responsável">{coResponsibleName}</Field>}

      <PredecessorField activityId={activity.id} />

      <Group grow>
        <Field label="Previsto">{formatDate(activity.deadline)}</Field>
        <Field label="Horário limite">{activity.dueTime ?? formatTime(activity.deadline)}</Field>
      </Group>

      {(activity.status === ActivityStatus.DONE || activity.status === ActivityStatus.LATE) &&
        activity.completionDate && <Field label="Concluído em">{formatTime(activity.completionDate)}</Field>}

      <Group grow>
        <Field label="Horas previstas">{activity.estimatedHours ?? '—'}</Field>
        <Field label="Horas excedentes">{activity.exceededHours.toFixed(1)}</Field>
      </Group>

      {activity.notes && <Field label="Observações">{activity.notes}</Field>}
    </Stack>
  );
}

export function ActivityDetailsDrawer({
  activity,
  responsibleName,
  coResponsibleName,
  onClose,
}: {
  activity: ActivityDto | null;
  responsibleName: string;
  coResponsibleName: string | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  // Shows the just-saved version immediately, without waiting for the parent's own
  // ['activities', ...] query (a different key per page) to refetch in the background.
  const [displayActivity, setDisplayActivity] = useState<ActivityDto | null>(activity);

  useEffect(() => {
    setDisplayActivity(activity);
  }, [activity]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateActivityInput) => updateActivity(displayActivity!.id, dto),
    onSuccess: (updated) => {
      setDisplayActivity(updated);
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['activity', updated.id] });
      notifications.show({ color: 'green', title: 'Atividade atualizada', message: updated.title });
    },
    onError: (err: unknown) => {
      notifications.show({
        color: 'red',
        title: 'Não foi possível salvar a atividade',
        message: err instanceof ApiError ? err.message : 'Erro inesperado',
      });
    },
  });

  return (
    <Drawer opened={!!activity} onClose={onClose} title="Detalhes da atividade" position="right" size="md">
      {displayActivity && (
        <Stack gap="md">
          {isAdmin && (
            <Group justify="flex-end">
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPencil size={14} />}
                onClick={() => setEditOpen(true)}
              >
                Editar
              </Button>
            </Group>
          )}
          <ActivityDetailsContent
            activity={displayActivity}
            responsibleName={responsibleName}
            coResponsibleName={coResponsibleName}
          />
        </Stack>
      )}
      {displayActivity && (
        <EditActivityModal
          opened={editOpen}
          onClose={() => setEditOpen(false)}
          activity={displayActivity}
          onSubmit={(dto) => updateMutation.mutate(dto)}
          isSaving={updateMutation.isPending}
        />
      )}
    </Drawer>
  );
}
