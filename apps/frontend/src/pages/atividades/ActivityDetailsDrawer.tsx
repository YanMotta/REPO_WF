import { Badge, Drawer, Group, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { ActivityDto } from '@workflow-brasal/shared';
import { ReactNode } from 'react';
import { getActivity, getActivityDependencies } from '../../api/activities';
import { STATUS_COLOR, STATUS_LABEL } from '../../constants/status';
import { formatBusinessDayRule, formatDate, formatTime } from '../../utils/format';

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
        <Field label="Horário">{activity.dueTime ?? formatTime(activity.deadline)}</Field>
      </Group>

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
  return (
    <Drawer opened={!!activity} onClose={onClose} title="Detalhes da atividade" position="right" size="md">
      {activity && (
        <ActivityDetailsContent
          activity={activity}
          responsibleName={responsibleName}
          coResponsibleName={coResponsibleName}
        />
      )}
    </Drawer>
  );
}
