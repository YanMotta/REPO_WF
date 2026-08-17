import { Button, Modal, NumberInput, Stack, Textarea } from '@mantine/core';
import { ActivityDto } from '@workflow-brasal/shared';
import { useEffect, useState } from 'react';
import { UpdateActivityProgressInput } from '../../api/activities';

/**
 * The responsible/co-responsible's own way to report how the work is actually going — progress,
 * hours worked, notes. Deliberately doesn't touch title/priority/deadline/etc (that's the
 * admin-only EditActivityModal) — this is the whole point of it existing as a separate, smaller
 * form rather than just unlocking the full edit modal for non-admins.
 */
export function UpdateProgressModal({
  opened,
  onClose,
  activity,
  onSubmit,
  isSaving,
}: {
  opened: boolean;
  onClose: () => void;
  activity: ActivityDto;
  onSubmit: (dto: UpdateActivityProgressInput) => void;
  isSaving: boolean;
}) {
  const [progressPercent, setProgressPercent] = useState<number | undefined>(activity.progressPercent);
  const [actualHours, setActualHours] = useState<number | undefined>(activity.actualHours ?? undefined);
  const [notes, setNotes] = useState(activity.notes ?? '');

  useEffect(() => {
    if (!opened) return;
    setProgressPercent(activity.progressPercent);
    setActualHours(activity.actualHours ?? undefined);
    setNotes(activity.notes ?? '');
  }, [opened, activity]);

  function handleSubmit() {
    const dto: UpdateActivityProgressInput = {};
    if (progressPercent !== activity.progressPercent) dto.progressPercent = progressPercent;
    if (actualHours !== (activity.actualHours ?? undefined)) dto.actualHours = actualHours;
    if (notes !== (activity.notes ?? '')) dto.notes = notes;

    if (Object.keys(dto).length === 0) {
      onClose();
      return;
    }
    onSubmit(dto);
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Atualizar andamento">
      <Stack>
        <NumberInput
          label="Progresso (%)"
          min={0}
          max={100}
          suffix="%"
          value={progressPercent ?? ''}
          onChange={(v) => setProgressPercent(v === '' ? undefined : Number(v))}
        />
        <NumberInput
          label="Horas realizadas"
          min={0}
          value={actualHours ?? ''}
          onChange={(v) => setActualHours(v === '' ? undefined : Number(v))}
        />
        <Textarea
          label="Observações"
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          autosize
          minRows={3}
        />

        <Button onClick={handleSubmit} loading={isSaving}>
          Salvar andamento
        </Button>
      </Stack>
    </Modal>
  );
}
