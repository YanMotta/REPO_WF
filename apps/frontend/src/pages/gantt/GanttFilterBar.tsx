import { Button, Group, Select, Switch } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconX } from '@tabler/icons-react';
import { ActivityPriority, ActivityStatus, UserDto } from '@workflow-brasal/shared';
import { PRIORITY_LABEL, STATUS_LABEL } from '../../constants/status';

export interface GanttFilters {
  responsibleId: number | null;
  status: ActivityStatus | null;
  priority: ActivityPriority | null;
  dateRange: [Date | null, Date | null];
  onlyLate: boolean;
  onlyBlocked: boolean;
}

export const EMPTY_GANTT_FILTERS: GanttFilters = {
  responsibleId: null,
  status: null,
  priority: null,
  dateRange: [null, null],
  onlyLate: false,
  onlyBlocked: false,
};

/** Fully controlled — no internal state — mirroring the filter `Group` pattern already used in
 * AtividadesPage.tsx, just with more fields. Filtering itself happens client-side in GanttPage.
 * No project filter: the app only ever has one project ("Fechamento Mensal"), so filtering by
 * project would be a no-op control. */
export function GanttFilterBar({
  users,
  filters,
  onChange,
  onClear,
}: {
  users: UserDto[];
  filters: GanttFilters;
  onChange: (next: GanttFilters) => void;
  onClear: () => void;
}) {
  function set<K extends keyof GanttFilters>(key: K, value: GanttFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <Group gap="xs" wrap="wrap">
      <Select
        placeholder="Responsável"
        w={{ base: '100%', sm: 180 }}
        clearable
        value={filters.responsibleId != null ? String(filters.responsibleId) : null}
        onChange={(value) => set('responsibleId', value ? Number(value) : null)}
        data={users.map((u) => ({ value: String(u.id), label: u.name }))}
      />
      <Select
        placeholder="Status"
        w={{ base: '100%', sm: 170 }}
        clearable
        value={filters.status}
        onChange={(value) => set('status', (value as ActivityStatus) || null)}
        data={Object.values(ActivityStatus).map((status) => ({ value: status, label: STATUS_LABEL[status] }))}
      />
      <Select
        placeholder="Prioridade"
        w={{ base: '100%', sm: 150 }}
        clearable
        value={filters.priority}
        onChange={(value) => set('priority', (value as ActivityPriority) || null)}
        data={Object.values(ActivityPriority).map((priority) => ({ value: priority, label: PRIORITY_LABEL[priority] }))}
      />
      <DatePickerInput
        type="range"
        placeholder="Período"
        w={{ base: '100%', sm: 220 }}
        clearable
        value={filters.dateRange}
        onChange={(value) => set('dateRange', value as [Date | null, Date | null])}
        valueFormat="DD/MM/YYYY"
      />
      <Group gap="md" wrap="nowrap">
        <Switch
          label="Só atrasadas"
          checked={filters.onlyLate}
          onChange={(event) => set('onlyLate', event.currentTarget.checked)}
        />
        <Switch
          label="Só bloqueadas"
          checked={filters.onlyBlocked}
          onChange={(event) => set('onlyBlocked', event.currentTarget.checked)}
        />
      </Group>
      <Button variant="subtle" size="compact-sm" leftSection={<IconX size={14} />} onClick={onClear}>
        Limpar filtros
      </Button>
    </Group>
  );
}
