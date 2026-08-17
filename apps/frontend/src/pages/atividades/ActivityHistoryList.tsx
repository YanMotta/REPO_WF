import { Group, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { ActivityHistoryDto, ActivityHistoryEventType } from '@workflow-brasal/shared';
import { getActivityHistory } from '../../api/activities';
import { listUsers } from '../../api/users';
import { HISTORY_EVENT_LABEL } from '../../constants/historyEvents';
import { STATUS_LABEL } from '../../constants/status';
import { formatDate, formatTime } from '../../utils/format';

/** Human-readable "before → after" for the two event types where the raw stored value is
 * meaningful on its own (a status code, a progress percent) — everything else (assignee/
 * co-responsible changes store a raw user id) just shows the event label without it, rather than
 * guessing at a user's name from a bare id with no name map wired in here. */
function describeChange(entry: ActivityHistoryDto): string | null {
  if (entry.eventType === ActivityHistoryEventType.STATUS_CHANGED && entry.oldValue && entry.newValue) {
    const from = STATUS_LABEL[entry.oldValue as keyof typeof STATUS_LABEL] ?? entry.oldValue;
    const to = STATUS_LABEL[entry.newValue as keyof typeof STATUS_LABEL] ?? entry.newValue;
    return `${from} → ${to}`;
  }
  if (
    entry.eventType === ActivityHistoryEventType.PROGRESS_UPDATED &&
    entry.oldValue != null &&
    entry.newValue != null
  ) {
    return `${entry.oldValue}% → ${entry.newValue}%`;
  }
  return null;
}

/** Read-only audit trail for one activity — who did what, and when. Only renders once there's
 * something to show, same convention as PredecessorField for an empty-but-not-broken state. */
export function ActivityHistoryList({ activityId }: { activityId: number }) {
  const historyQuery = useQuery({
    queryKey: ['activity-history', activityId],
    queryFn: () => getActivityHistory(activityId),
  });
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: listUsers });

  if (!historyQuery.data || historyQuery.data.length === 0) return null;

  const userNameById = new Map((usersQuery.data ?? []).map((u) => [u.id, u.name]));

  return (
    <div>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
        Histórico
      </Text>
      <Stack gap={6}>
        {historyQuery.data.map((entry) => {
          const change = describeChange(entry);
          const actor = entry.changedById != null ? (userNameById.get(entry.changedById) ?? '—') : 'Sistema';
          return (
            <Group key={entry.id} gap="xs" wrap="nowrap" align="baseline">
              <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                {formatDate(entry.occurredAt)} {formatTime(entry.occurredAt)}
              </Text>
              <Text size="xs">
                {HISTORY_EVENT_LABEL[entry.eventType]}
                {change ? ` (${change})` : ''} — {actor}
              </Text>
            </Group>
          );
        })}
      </Stack>
    </div>
  );
}
