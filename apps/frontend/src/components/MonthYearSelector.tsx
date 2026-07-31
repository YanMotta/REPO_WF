import { Group, Select } from '@mantine/core';

const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function buildYearOptions(centerYear: number): string[] {
  const years: string[] = [];
  for (let y = centerYear - 2; y <= centerYear + 2; y++) years.push(String(y));
  return years;
}

export function MonthYearSelector({
  month,
  year,
  onChange,
}: {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}) {
  const yearOptions = buildYearOptions(new Date().getFullYear());

  return (
    <Group gap="xs">
      <Select
        value={String(month)}
        onChange={(value) => value && onChange(Number(value), year)}
        data={MONTH_LABELS.map((label, index) => ({ value: String(index + 1), label }))}
        w={160}
        allowDeselect={false}
      />
      <Select
        value={String(year)}
        onChange={(value) => value && onChange(month, Number(value))}
        data={yearOptions}
        w={100}
        allowDeselect={false}
      />
    </Group>
  );
}
