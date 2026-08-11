import { Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ActivityDto } from '@workflow-brasal/shared';
import { ROW_HEIGHT } from './gantt.constants';
import { BarGeometry } from './gantt.layout';
import { GanttActivityBar } from './GanttActivityBar';

export function GanttActivityRow({
  activity,
  responsibleName,
  geometry,
  isBlocked,
  trackWidth,
  labelColumnWidth,
  onSelect,
}: {
  activity: ActivityDto;
  responsibleName: string;
  geometry: BarGeometry | null;
  isBlocked: boolean;
  trackWidth: number;
  labelColumnWidth: number;
  onSelect: () => void;
}) {
  const isMobile = useMediaQuery('(max-width: 48em)');

  return (
    <div style={{ display: 'flex', height: ROW_HEIGHT }}>
      <div
        style={{
          width: labelColumnWidth,
          flexShrink: 0,
          position: 'sticky',
          left: 0,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          paddingLeft: isMobile ? 16 : 28,
          paddingRight: 8,
          background: 'var(--mantine-color-body)',
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Text size="sm" truncate style={{ flex: 1 }}>
          {activity.title}
        </Text>
        {!isMobile && (
          <Text size="xs" c="dimmed" truncate style={{ maxWidth: 90 }}>
            {responsibleName}
          </Text>
        )}
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
