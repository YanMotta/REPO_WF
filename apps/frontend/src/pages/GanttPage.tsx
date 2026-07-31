import { Group, Loader, Paper, Stack, Text, Title, Tooltip } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { listActivities } from '../api/activities';
import { listProjects } from '../api/projects';
import { MonthYearSelector } from '../components/MonthYearSelector';
import { STATUS_COLOR, STATUS_LABEL } from '../constants/status';
import { formatDate, formatTime } from '../utils/format';

const DAY_MS = 1000 * 60 * 60 * 24;
const MIN_BAR_PERCENT = 6;
const LABEL_WIDTH = 260;
const DATE_WIDTH = 140;
const GAP = 16;
// Track area sits between the label column and the date column — used to align the gridline
// overlay (which lives outside the per-row flex layout) with the actual bar track.
const TRACK_LEFT = LABEL_WIDTH + GAP;
const TRACK_RIGHT = DATE_WIDTH + GAP;
const now = new Date();

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

function clamp(date: Date, min: Date, max: Date): Date {
  if (date < min) return min;
  if (date > max) return max;
  return date;
}

export function GanttPage() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const activitiesQuery = useQuery({
    queryKey: ['activities', 'gantt', month, year],
    queryFn: () => listActivities({ month, year }),
  });
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects });

  const projectNameById = useMemo(() => {
    const map = new Map<number, string>();
    (projectsQuery.data ?? []).forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projectsQuery.data]);

  const { rows, ticks, todayPercent, totalDaysInMonth } = useMemo(() => {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const days = daysBetween(start, end) + 1;

    const activities = activitiesQuery.data ?? [];
    const computedRows = activities
      .filter((a) => a.deadline)
      .map((a) => {
        const deadlineEnd = clamp(startOfDay(new Date(a.deadline as string)), start, end);
        // No explicit startDate on most checklist activities — default to a short lead-in window
        // ending at the deadline, just enough to render a visible, position-meaningful bar.
        const barStart = a.startDate
          ? clamp(startOfDay(new Date(a.startDate)), start, deadlineEnd)
          : clamp(addDays(deadlineEnd, -3), start, deadlineEnd);

        const leftPercent = (daysBetween(start, barStart) / days) * 100;
        const widthPercent = Math.max((daysBetween(barStart, deadlineEnd) / days) * 100, MIN_BAR_PERCENT);

        return { activity: a, leftPercent, widthPercent };
      })
      .sort((a, b) => a.leftPercent - b.leftPercent);

    // Day-axis ticks: 1st of the month, then every 5 days, always including the last day.
    const dayNumbers = new Set<number>([1]);
    for (let d = 5; d <= days; d += 5) dayNumbers.add(d);
    dayNumbers.add(days);
    const computedTicks = Array.from(dayNumbers)
      .sort((a, b) => a - b)
      .map((day) => ({ day, percent: ((day - 1) / days) * 100 }));

    const todayStart = startOfDay(now);
    const isCurrentMonthVisible = todayStart >= start && todayStart <= end;
    const computedTodayPercent = isCurrentMonthVisible ? (daysBetween(start, todayStart) / days) * 100 : null;

    return { rows: computedRows, ticks: computedTicks, todayPercent: computedTodayPercent, totalDaysInMonth: days };
  }, [activitiesQuery.data, month, year]);

  const isLoading = activitiesQuery.isLoading || projectsQuery.isLoading;
  const projectCount = new Set((activitiesQuery.data ?? []).map((a) => a.projectId)).size;

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Gantt</Title>
        <MonthYearSelector
          month={month}
          year={year}
          onChange={(m, y) => {
            setMonth(m);
            setYear(y);
          }}
        />
      </Group>

      {isLoading ? (
        <Loader />
      ) : rows.length === 0 ? (
        <Text c="dimmed">Nenhuma atividade neste mês.</Text>
      ) : (
        <Paper withBorder p="lg" radius="md">
          {/* Day axis */}
          <Group wrap="nowrap" gap={GAP} mb={4}>
            <div style={{ width: LABEL_WIDTH, flexShrink: 0 }} />
            <div style={{ position: 'relative', flex: 1, height: 20 }}>
              {ticks.map((tick) => (
                <Text
                  key={tick.day}
                  size="xs"
                  c="dimmed"
                  style={{
                    position: 'absolute',
                    left: `${tick.percent}%`,
                    transform: tick.day === totalDaysInMonth ? 'translateX(-100%)' : undefined,
                  }}
                >
                  {tick.day}
                </Text>
              ))}
            </div>
            <div style={{ width: DATE_WIDTH, flexShrink: 0 }} />
          </Group>

          {/* Rows + gridline/today overlay (overlay aligned to the track area via TRACK_LEFT/RIGHT) */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: TRACK_LEFT, right: TRACK_RIGHT, top: 0, bottom: 0 }}>
              {ticks.map((tick) => (
                <div
                  key={tick.day}
                  style={{
                    position: 'absolute',
                    left: `${tick.percent}%`,
                    top: 0,
                    bottom: 0,
                    borderLeft: '1px solid var(--mantine-color-default-border)',
                  }}
                />
              ))}
              {todayPercent != null && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${todayPercent}%`,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: 'var(--mantine-color-workflow-6)',
                    zIndex: 1,
                  }}
                />
              )}
            </div>

            <Stack gap="lg" style={{ position: 'relative' }}>
              {rows.map(({ activity, leftPercent, widthPercent }) => (
                <Group key={activity.id} wrap="nowrap" gap={GAP}>
                  <Text size="sm" w={LABEL_WIDTH} style={{ flexShrink: 0 }} truncate>
                    {activity.title}
                    {projectCount > 1 && (
                      <Text component="span" size="xs" c="dimmed">
                        {' '}
                        · {projectNameById.get(activity.projectId) ?? `#${activity.projectId}`}
                      </Text>
                    )}
                  </Text>
                  <div style={{ position: 'relative', flex: 1, height: 22 }}>
                    <Tooltip
                      label={`${STATUS_LABEL[activity.status]} — prazo ${formatDate(activity.deadline)}`}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                          height: '100%',
                          borderRadius: 999,
                          background: `var(--mantine-color-${STATUS_COLOR[activity.status]}-6)`,
                        }}
                      />
                    </Tooltip>
                  </div>
                  <Group gap={6} w={DATE_WIDTH} style={{ flexShrink: 0 }} justify="flex-end">
                    <Text size="xs" c="dimmed">
                      {formatDate(activity.deadline)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {activity.dueTime ?? formatTime(activity.deadline)}
                    </Text>
                  </Group>
                </Group>
              ))}
            </Stack>
          </div>
        </Paper>
      )}
    </>
  );
}
