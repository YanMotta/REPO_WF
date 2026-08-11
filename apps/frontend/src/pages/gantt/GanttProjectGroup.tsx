import { Badge, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { ActivityDto, ProjectDto } from '@workflow-brasal/shared';
import { PROJECT_HEADER_HEIGHT } from './gantt.constants';
import { BarGeometry } from './gantt.layout';
import { GanttActivityRow } from './GanttActivityRow';

export function GanttProjectGroup({
  project,
  activities,
  collapsed,
  onToggleCollapse,
  userNameById,
  blockedActivityIds,
  geometryByActivityId,
  trackWidth,
  labelColumnWidth,
  onSelectActivity,
}: {
  project: ProjectDto;
  activities: ActivityDto[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  userNameById: Map<number, string>;
  blockedActivityIds: Set<number>;
  geometryByActivityId: Map<number, BarGeometry | null>;
  trackWidth: number;
  labelColumnWidth: number;
  onSelectActivity: (activity: ActivityDto) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', height: PROJECT_HEADER_HEIGHT }}>
        <div
          style={{
            width: labelColumnWidth,
            flexShrink: 0,
            position: 'sticky',
            left: 0,
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            background: 'var(--mantine-color-gray-0)',
            borderBottom: '1px solid var(--mantine-color-default-border)',
          }}
        >
          <UnstyledButton
            onClick={onToggleCollapse}
            style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', paddingInline: 8 }}
          >
            {collapsed ? <IconChevronRight size={14} /> : <IconChevronDown size={14} />}
            <Text size="sm" fw={600} truncate style={{ flex: 1 }}>
              {project.name}
            </Text>
            <Badge size="xs" variant="light" color="gray">
              {activities.length}
            </Badge>
          </UnstyledButton>
        </div>
        <div
          style={{
            width: trackWidth,
            background: 'var(--mantine-color-gray-0)',
            borderBottom: '1px solid var(--mantine-color-default-border)',
          }}
        />
      </div>

      {!collapsed &&
        activities.map((activity) => (
          <GanttActivityRow
            key={activity.id}
            activity={activity}
            responsibleName={
              activity.responsibleId != null ? userNameById.get(activity.responsibleId) ?? '—' : 'Sem responsável'
            }
            geometry={geometryByActivityId.get(activity.id) ?? null}
            isBlocked={blockedActivityIds.has(activity.id)}
            trackWidth={trackWidth}
            labelColumnWidth={labelColumnWidth}
            onSelect={() => onSelectActivity(activity)}
          />
        ))}
    </div>
  );
}
