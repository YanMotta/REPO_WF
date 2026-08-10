import { Text } from '@mantine/core';
import { Gridline } from './gantt.layout';

const HEADER_HEIGHT = 28;

export function GanttTimelineHeader({
  gridlines,
  todayX,
  width,
}: {
  gridlines: Gridline[];
  todayX: number | null;
  width: number;
}) {
  return (
    <div style={{ position: 'relative', width, height: HEADER_HEIGHT }}>
      {gridlines.map((line, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: line.x,
            top: 0,
            bottom: 0,
            borderLeft: `1px solid var(--mantine-color-default-border)`,
            paddingLeft: 4,
          }}
        >
          <Text size="xs" c="dimmed" fw={line.isMonthBoundary ? 600 : 400} style={{ whiteSpace: 'nowrap' }}>
            {line.label}
          </Text>
        </div>
      ))}
      {todayX != null && (
        <div
          style={{
            position: 'absolute',
            left: todayX,
            top: 0,
            bottom: 0,
            width: 2,
            background: 'var(--mantine-color-workflow-6)',
            zIndex: 2,
          }}
        />
      )}
    </div>
  );
}
