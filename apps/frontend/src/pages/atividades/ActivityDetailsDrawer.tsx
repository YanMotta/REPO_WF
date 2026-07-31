import { Badge, Drawer, Group, Stack, Text } from '@mantine/core';
import { ActivityDto } from '@workflow-brasal/shared';
import { ReactNode } from 'react';
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
      )}
    </Drawer>
  );
}
