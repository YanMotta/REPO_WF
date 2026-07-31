import { Button, Modal, NumberInput, Select, SegmentedControl, Stack, Textarea, TextInput } from '@mantine/core';
import { DateInput, TimeInput } from '@mantine/dates';
import { ActivityPriority, UserDto } from '@workflow-brasal/shared';
import { useState } from 'react';
import { CreateActivityDto } from '../../api/activities';
import { BusinessDayRuleInput } from '../../components/BusinessDayRuleInput';

const PRIORITY_OPTIONS = [
  { value: ActivityPriority.LOW, label: 'Baixa' },
  { value: ActivityPriority.MEDIUM, label: 'Média' },
  { value: ActivityPriority.HIGH, label: 'Alta' },
  { value: ActivityPriority.URGENT, label: 'Urgente' },
];

const now = new Date();

/**
 * "Nova atividade avulsa" — the sole place in the system where a one-off Activity can be created
 * outside the recurring checklist. Always locked to the fixed "Fechamento Mensal" project.
 */
export function CreateActivityModal({
  opened,
  onClose,
  onSubmit,
  users,
  projectId,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateActivityDto) => void;
  users: UserDto[];
  projectId: number | null;
}) {
  const [mode, setMode] = useState<'rule' | 'manual'>('rule');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [responsibleId, setResponsibleId] = useState<number | undefined>();
  const [priority, setPriority] = useState<ActivityPriority>(ActivityPriority.MEDIUM);
  const [businessDayOffset, setBusinessDayOffset] = useState(1);
  const [manualDeadline, setManualDeadline] = useState<Date | null>(null);
  const [dueTime, setDueTime] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number | undefined>();
  const [notes, setNotes] = useState('');

  function reset() {
    setMode('rule');
    setTitle('');
    setDescription('');
    setResponsibleId(undefined);
    setPriority(ActivityPriority.MEDIUM);
    setBusinessDayOffset(1);
    setManualDeadline(null);
    setDueTime('');
    setEstimatedHours(undefined);
    setNotes('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit() {
    if (!projectId || !title.trim()) return;

    const dto: CreateActivityDto = {
      projectId,
      title,
      description: description || undefined,
      responsibleId,
      priority,
      dueTime: dueTime || undefined,
      estimatedHours,
      notes: notes || undefined,
    };

    if (mode === 'rule') {
      dto.businessDayOffset = businessDayOffset;
      dto.dueDateRuleMonth = now.getMonth() + 1;
      dto.dueDateRuleYear = now.getFullYear();
    } else if (manualDeadline) {
      dto.deadline = manualDeadline.toISOString().slice(0, 10);
    }

    onSubmit(dto);
    reset();
  }

  return (
    <Modal opened={opened} onClose={handleClose} title="Nova atividade avulsa" size="lg">
      <Stack>
        <TextInput label="Título" required value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
        <Textarea label="Descrição" value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
        <Select
          label="Responsável"
          data={users.map((u) => ({ value: String(u.id), label: u.name }))}
          value={responsibleId ? String(responsibleId) : null}
          onChange={(v) => setResponsibleId(v ? Number(v) : undefined)}
          clearable
        />
        <Select
          label="Prioridade"
          data={PRIORITY_OPTIONS}
          value={priority}
          onChange={(v) => v && setPriority(v as ActivityPriority)}
          allowDeselect={false}
        />

        <SegmentedControl
          value={mode}
          onChange={(v) => setMode(v as 'rule' | 'manual')}
          data={[
            { value: 'rule', label: 'Regra de dia útil' },
            { value: 'manual', label: 'Data manual' },
          ]}
        />

        {mode === 'rule' ? (
          <BusinessDayRuleInput value={businessDayOffset} onChange={setBusinessDayOffset} />
        ) : (
          <DateInput label="Prazo" value={manualDeadline} onChange={setManualDeadline} />
        )}

        <TimeInput label="Horário-limite" value={dueTime} onChange={(e) => setDueTime(e.currentTarget.value)} />
        <NumberInput
          label="Horas previstas"
          min={0}
          value={estimatedHours ?? ''}
          onChange={(v) => setEstimatedHours(v === '' ? undefined : Number(v))}
        />
        <Textarea label="Observações" value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />

        <Button onClick={handleSubmit} disabled={!title.trim() || !projectId}>
          Criar
        </Button>
      </Stack>
    </Modal>
  );
}
