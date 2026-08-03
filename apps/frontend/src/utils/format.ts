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

/** e.g. formatMonthYear(8, 2026) -> "Agosto 2026" */
export function formatMonthYear(month: number, year: number): string {
  return `${MONTH_LABELS[month - 1]} ${year}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Human label for a signed business-day offset, e.g. 1 -> "1º dia útil", -1 -> "Último dia útil". */
export function formatBusinessDayRule(businessDayOffset: number | null): string {
  if (businessDayOffset == null) return 'Manual';
  if (businessDayOffset === -1) return 'Último dia útil';
  if (businessDayOffset < 0) return `${Math.abs(businessDayOffset)}º dia útil (do fim)`;
  return `${businessDayOffset}º dia útil`;
}
