import { Text } from '@mantine/core';
import { ActivityDto } from '@workflow-brasal/shared';
import { LABEL_COLUMN_WIDTH, ROW_HEIGHT } from './gantt.constants';
import { BarGeometry } from './gantt.layout';
import { GanttActivityBar } from './GanttActivityBar';

export function GanttActivityRow({
  activity,
  responsibleName,
  geometry,
  isBlocked,
  trackWidth,
  onSelect,
}: {
  activity: ActivityDto;
  responsibleName: string;
  geometry: BarGeometry | null;
  isBlocked: boolean;
  trackWidth: number;
  onSelect: () => void;
}) {
  return (
    <div style={{ display: 'flex', height: ROW_HEIGHT }}>
      <div
        style={{
          width: LABEL_COLUMN_WIDTH,
          flexShrink: 0,
          position: 'sticky',
          left: 0,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          paddingLeft: 28,
          paddingRight: 8,
          background: 'var(--mantine-color-body)',
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Text size="sm" truncate style={{ flex: 1 }}>
          {activity.title}
        </Text>
        <Text size="xs" c="dimmed" truncate style={{ maxWidth: 90 }}>
          {responsibleName}
        </Text>
      </div>
      <div
        style={{
          position: 'relative',
          width: trackWidth,
          height: '100%',
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        {geometry && (
          <GanttActivityBar
            activity={activity}
            left={geometry.left}
            width={geometry.width}
            isBlocked={isBlocked}
            onClick={onSelect}
          />
        )}
      </div>
    </div>
  );
}
