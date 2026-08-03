import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { listActivities } from '../api/activities';

const now = new Date();
const CURRENT_MONTH = now.getMonth() + 1;
const CURRENT_YEAR = now.getFullYear();

/**
 * The month/year that Atividades/Dashboard/Quadro default to: the most recently generated
 * closure (by dueDateRuleMonth/Year), not necessarily the calendar's current month — closure
 * generation is manual now (see ChecklistPage), so the calendar month may not have one yet.
 * Falls back to the calendar's current month/year if no closure has ever been generated.
 */
export function useCurrentClosureMonth(): { month: number; year: number; isLoading: boolean } {
  const query = useQuery({ queryKey: ['activities', 'all'], queryFn: () => listActivities() });

  const { month, year } = useMemo(() => {
    let best: { month: number; year: number } | null = null;
    (query.data ?? []).forEach((activity) => {
      if (activity.dueDateRuleMonth == null || activity.dueDateRuleYear == null) return;
      // Never a month beyond the current one — closure generation itself never runs ahead.
      if (
        activity.dueDateRuleYear > CURRENT_YEAR ||
        (activity.dueDateRuleYear === CURRENT_YEAR && activity.dueDateRuleMonth > CURRENT_MONTH)
      ) {
        return;
      }
      if (
        !best ||
        activity.dueDateRuleYear > best.year ||
        (activity.dueDateRuleYear === best.year && activity.dueDateRuleMonth > best.month)
      ) {
        best = { year: activity.dueDateRuleYear, month: activity.dueDateRuleMonth };
      }
    });
    return best ?? { month: CURRENT_MONTH, year: CURRENT_YEAR };
  }, [query.data]);

  return { month, year, isLoading: query.isLoading };
}
