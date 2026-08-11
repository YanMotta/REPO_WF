import { Text, Tooltip } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconCheck, IconLock } from '@tabler/icons-react';
import { ActivityDto } from '@workflow-brasal/shared';
import { PRIORITY_COLOR, STATUS_COLOR, STATUS_LABEL } from '../../constants/status';
import { formatDate } from '../../utils/format';

/**
 * Position is fully prop-driven (left/width as plain numbers, no internal state) so a future
 * drag-to-move/resize-to-edit phase can add pointer handlers to this exact component without
 * touching how its geometry is computed or how its parent/siblings render.
 */
export function GanttActivityBar({
  activity,
  left,
  width,
  isBlocked,
  onClick,
}: {
  activity: ActivityDto;
  left: number;
  width: number;
  isBlocked: boolean;
  onClick: () => void;
}) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const isDone = activity.status === 'DONE';
  const progress = Math.min(Math.max(activity.progressPercent, 0), 100);
  const color = STATUS_COLOR[activity.status];

  const tooltipLabel = `${activity.title} — ${STATUS_LABEL[activity.status]} — prazo ${formatDate(activity.deadline)}${isBlocked ? ' — bloqueada' : ''}`;

  return (
    // onClick lives on this outer div, not on Tooltip's direct child — Tooltip's floating-ui prop
    // merging doesn't reliably forward a plain onClick passed straight to its child, but a click
    // on the inner content still bubbles up here regardless, since that's plain DOM event
    // propagation and doesn't depend on Tooltip's prop merging at all.
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        left,
        width,
        top: isMobile ? 2 : 4,
        bottom: isMobile ? 2 : 4,
        borderRadius: 4,
        overflow: 'hidden',
        cursor: 'pointer',
        border: `1px solid var(--mantine-color-${color}-4)`,
      }}
    >
      <Tooltip label={tooltipLabel} openDelay={300} withinPortal>
        <div style={{ position: 'absolute', inset: 0 }}>
          {/* Base fill — status color, per STATUS_COLOR (never recomputed, just read). */}
          <div style={{ position: 'absolute', inset: 0, background: `var(--mantine-color-${color}-2)` }} />
          {/* Progress fill — existing progressPercent field, no new computation. */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: `${progress}%`,
              background: `var(--mantine-color-${color}-6)`,
            }}
          />
          {/* Priority accent stripe — separate visual channel from status. */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              background: `var(--mantine-color-${PRIORITY_COLOR[activity.priority]}-6)`,
            }}
          />
          {isBlocked && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(0,0,0,0.18) 0, rgba(0,0,0,0.18) 3px, transparent 3px, transparent 8px)',
              }}
            />
          )}
          <div
            style={{
              position: 'relative',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              paddingLeft: 6,
              paddingRight: 4,
            }}
          >
            {isBlocked && <IconLock size={12} style={{ flexShrink: 0 }} />}
            {isDone && <IconCheck size={12} style={{ flexShrink: 0 }} />}
            {width > 60 && (
              <Text size="xs" fw={500} truncate style={{ lineHeight: 1 }}>
                {activity.title}
              </Text>
            )}
          </div>
        </div>
      </Tooltip>
    </div>
  );
}
