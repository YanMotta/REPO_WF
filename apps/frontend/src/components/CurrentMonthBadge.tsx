import { Badge } from '@mantine/core';
import { formatMonthYear } from '../utils/format';

/** Read-only indicator of the month/year a page's data is scoped to — every page always shows
 * the current month, so this just tells the user which one that is. */
export function CurrentMonthBadge({ month, year }: { month: number; year: number }) {
  return (
    <Badge variant="light" color="workflow" size="lg">
      {formatMonthYear(month, year)}
    </Badge>
  );
}
