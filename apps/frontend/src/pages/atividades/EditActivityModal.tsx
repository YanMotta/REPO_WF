import { Button, Group, Modal, NumberInput, Select, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { ActivityDto, ActivityPriority } from '@workflow-brasal/shared';
import { useEffect, useState } from 'react';
import { UpdateActivityInput } from '../../api/activities';

const PRIORITY_OPTIONS = [
  { value: ActivityPriority.LOW, label: 'Baixa' },
  { value: ActivityPriority.MEDIUM, label: 'Média' },
  { value: ActivityPriority.HIGH, label: 'Alta' },
  { value: ActivityPriority.URGENT, label: 'Urgente' },
];

function toDateOnly(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

function dateOnlyOf(iso: string | null): string | null {
  return iso ? iso.slice(0, 10) : null;
}

/**
 * Edits an existing activity's own fields — title, description, priority, dates, hours,
 * progress, notes. Responsible/co-responsible and status changes go through their own dedicated
 * controls elsewhere (ResponsibleCell, Kanban drag), so they're deliberately not here — this
 * mirrors exactly what PATCH /activities/:id accepts.
 *
 * Only fields the admin actually changed are sent, not the whole form — sending an unchanged
 * `deadline` would still detach the activity from its business-day rule (see UpdateActivityDto),
 * so a no-op edit must produce a no-op request.
 */
export function EditActivityModal({
  opened,
  onClose,
  activity,
  onSubmit,
  isSaving,
}: {
  opened: boolean;
  onClose: () => void;
  activity: ActivityDto;
  onSubmit: (dto: UpdateActivityInput) => void;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState(activity.title);
  const [description, setDescription] = useState(activity.description ?? '');
  const [priority, setPriority] = useState<ActivityPriority>(activity.priority);
  const [startDate, setStartDate] = useState<Date | null>(
    activity.startDate ? new Date(activity.startDate) : null,
  );
  const [deadline, setDeadline] = useState<Date | null>(activity.deadline ? new Date(activity.deadline) : null);
  const [estimatedHours, setEstimatedHours] = useState<number | undefined>(activity.estimatedHours ?? undefined);
  const [actualHours, setActualHours] = useState<number | undefined>(activity.actualHours ?? undefined);
  const [progressPercent, setProgressPercent] = useState<number | undefined>(activity.progressPercent);
  const [notes, setNotes] = useState(activity.notes ?? '');

  useEffect(() => {
    if (!opened) return;
    setTitle(activity.title);
    setDescription(activity.description ?? '');
    setPriority(activity.priority);
    setStartDate(activity.startDate ? new Date(activity.startDate) : null);
    setDeadline(activity.deadline ? new Date(activity.deadline) : null);
    setEstimatedHours(activity.estimatedHours ?? undefined);
    setActualHours(activity.actualHours ?? undefined);
    setProgressPercent(activity.progressPercent);
    setNotes(activity.notes ?? '');
  }, [opened, activity]);

  function handleSubmit() {
    if (!title.trim()) return;

    const dto: UpdateActivityInput = {};
    if (title.trim() !== activity.title) dto.title = title.trim();
    if (description !== (activity.description ?? '')) dto.description = description;
    if (priority !== activity.priority) dto.priority = priority;
    if (toDateOnly(startDate) !== dateOnlyOf(activity.startDate)) {
      const value = toDateOnly(startDate);
      if (value) dto.startDate = value;
    }
    if (toDateOnly(deadline) !== dateOnlyOf(activity.deadline)) {
      const value = toDateOnly(deadline);
      if (value) dto.deadline = value;
    }
    if (estimatedHours !== (activity.estimatedHours ?? undefined)) dto.estimatedHours = estimatedHours;
    if (actualHours !== (activity.actualHours ?? undefined)) dto.actualHours = actualHours;
    if (progressPercent !== activity.progressPercent) dto.progressPercent = progressPercent;
    if (notes !== (activity.notes ?? '')) dto.notes = notes;

    if (Object.keys(dto).length === 0) {
      onClose();
      return;
    }

    onSubmit(dto);
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Editar atividade" size="lg">
      <Stack>
        <TextInput label="Título" required value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
        <Textarea label="Descrição" value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
        <Select
          label="Prioridade"
          data={PRIORITY_OPTIONS}
          value={priority}
          onChange={(v) => v && setPriority(v as ActivityPriority)}
          allowDeselect={false}
        />

        <Group grow align="flex-start">
          <DateInput label="Início" value={startDate} onChange={setStartDate} />
          <div>
            <DateInput label="Prazo" value={deadline} onChange={setDeadline} />
            {activity.businessDayOffset != null && (
              <Text size="xs" c="dimmed" mt={4}>
                Esta atividade segue uma regra de dia útil automática. Alterar o prazo aqui a
                transforma em uma data manual fixa.
              </Text>
            )}
          </div>
        </Group>

        <Group grow>
          <NumberInput
            label="Horas previstas"
            min={0}
            value={estimatedHours ?? ''}
            onChange={(v) => setEstimatedHours(v === '' ? undefined : Number(v))}
          />
          <NumberInput
            label="Horas realizadas"
            min={0}
            value={actualHours ?? ''}
            onChange={(v) => setActualHours(v === '' ? undefined : Number(v))}
          />
          <NumberInput
            label="Progresso (%)"
            min={0}
            max={100}
            suffix="%"
            value={progressPercent ?? ''}
            onChange={(v) => setProgressPercent(v === '' ? undefined : Number(v))}
          />
        </Group>

        <Textarea label="Observações" value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />

        <Button onClick={handleSubmit} disabled={!title.trim()} loading={isSaving}>
          Salvar alterações
        </Button>
      </Stack>
    </Modal>
  );
}
