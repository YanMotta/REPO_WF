import { Button, Modal, MultiSelect, NumberInput, Select, Stack, Switch, Textarea, TextInput } from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import { ActivityPriority, ActivityTemplateDto, UserDto } from '@workflow-brasal/shared';
import { useEffect, useState } from 'react';
import { ActivityTemplateInput } from '../../api/activityTemplates';
import { BusinessDayRuleInput } from '../../components/BusinessDayRuleInput';

const PRIORITY_OPTIONS = [
  { value: ActivityPriority.LOW, label: 'Baixa' },
  { value: ActivityPriority.MEDIUM, label: 'Média' },
  { value: ActivityPriority.HIGH, label: 'Alta' },
  { value: ActivityPriority.URGENT, label: 'Urgente' },
];

function emptyForm(): ActivityTemplateInput {
  return { title: '', businessDayOffset: 1, priority: ActivityPriority.MEDIUM, isActive: true };
}

export function TemplateFormModal({
  opened,
  onClose,
  onSubmit,
  editing,
  users,
  otherTemplates,
  initialDependsOnTemplateIds,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (input: ActivityTemplateInput) => void;
  editing: ActivityTemplateDto | null;
  users: UserDto[];
  otherTemplates: ActivityTemplateDto[];
  initialDependsOnTemplateIds: number[];
}) {
  const [form, setForm] = useState<ActivityTemplateInput>(emptyForm());

  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.title,
        description: editing.description ?? undefined,
        responsibleId: editing.responsibleId ?? undefined,
        priority: editing.priority,
        businessDayOffset: editing.businessDayOffset,
        dueTime: editing.dueTime ?? undefined,
        estimatedHours: editing.estimatedHours ?? undefined,
        notes: editing.notes ?? undefined,
        isActive: editing.isActive,
        dependsOnTemplateIds: initialDependsOnTemplateIds,
      });
    } else {
      setForm(emptyForm());
    }
  }, [editing, initialDependsOnTemplateIds, opened]);

  function handleSubmit() {
    onSubmit(form);
  }

  return (
    <Modal opened={opened} onClose={onClose} title={editing ? 'Editar modelo' : 'Novo modelo'} size="lg">
      <Stack>
        <TextInput
          label="Título"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.currentTarget.value })}
        />
        <Textarea
          label="Descrição"
          value={form.description ?? ''}
          onChange={(e) => setForm({ ...form, description: e.currentTarget.value })}
        />
        <Select
          label="Responsável"
          data={users.map((u) => ({ value: String(u.id), label: u.name }))}
          value={form.responsibleId ? String(form.responsibleId) : null}
          onChange={(v) => setForm({ ...form, responsibleId: v ? Number(v) : undefined })}
          clearable
        />
        <Select
          label="Prioridade"
          data={PRIORITY_OPTIONS}
          value={form.priority}
          onChange={(v) => v && setForm({ ...form, priority: v as ActivityPriority })}
          allowDeselect={false}
        />
        <BusinessDayRuleInput
          value={form.businessDayOffset}
          onChange={(v) => setForm({ ...form, businessDayOffset: v })}
        />
        <TimeInput
          label="Horário-limite"
          value={form.dueTime ?? ''}
          onChange={(e) => setForm({ ...form, dueTime: e.currentTarget.value || undefined })}
        />
        <MultiSelect
          label="Predecessoras"
          data={otherTemplates.map((t) => ({ value: String(t.id), label: t.title }))}
          value={(form.dependsOnTemplateIds ?? []).map(String)}
          onChange={(values) => setForm({ ...form, dependsOnTemplateIds: values.map(Number) })}
        />
        <NumberInput
          label="Horas previstas"
          min={0}
          value={form.estimatedHours ?? ''}
          onChange={(v) => setForm({ ...form, estimatedHours: v === '' ? undefined : Number(v) })}
        />
        <Textarea
          label="Observações"
          value={form.notes ?? ''}
          onChange={(e) => setForm({ ...form, notes: e.currentTarget.value })}
        />
        {editing && (
          <Switch
            label="Ativo"
            checked={form.isActive ?? true}
            onChange={(e) => setForm({ ...form, isActive: e.currentTarget.checked })}
          />
        )}
        <Button onClick={handleSubmit} disabled={!form.title.trim()}>
          Salvar
        </Button>
      </Stack>
    </Modal>
  );
}
