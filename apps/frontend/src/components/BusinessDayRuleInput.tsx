import { Group, NumberInput, Select } from '@mantine/core';

/**
 * Combines "a partir do início/fim do mês" + a business-day number into the signed
 * `businessDayOffset` the backend expects (positive counts from month start, negative from end).
 */
export function BusinessDayRuleInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const anchor = value < 0 ? 'end' : 'start';
  const dayNumber = Math.abs(value) || 1;

  function handleAnchorChange(newAnchor: string | null) {
    if (!newAnchor) return;
    onChange(newAnchor === 'end' ? -dayNumber : dayNumber);
  }

  function handleDayNumberChange(newDayNumber: number | string) {
    const n = Number(newDayNumber) || 1;
    onChange(anchor === 'end' ? -n : n);
  }

  return (
    <Group gap="xs" grow>
      <Select
        label="Premissa"
        value={anchor}
        onChange={handleAnchorChange}
        allowDeselect={false}
        data={[
          { value: 'start', label: 'A partir do início do mês' },
          { value: 'end', label: 'A partir do fim do mês' },
        ]}
      />
      <NumberInput label="Dia útil" min={1} value={dayNumber} onChange={handleDayNumberChange} />
    </Group>
  );
}
