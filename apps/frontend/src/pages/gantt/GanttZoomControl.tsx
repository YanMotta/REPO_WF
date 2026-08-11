import { SegmentedControl } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ZOOM_OPTIONS, ZoomLevel } from './gantt.constants';

export function GanttZoomControl({ value, onChange }: { value: ZoomLevel; onChange: (zoom: ZoomLevel) => void }) {
  const isMobile = useMediaQuery('(max-width: 48em)');

  return (
    <SegmentedControl
      value={value}
      onChange={(next) => onChange(next as ZoomLevel)}
      data={ZOOM_OPTIONS.map((option) => ({
        value: option.value,
        label: isMobile ? option.label.charAt(0) : option.label,
      }))}
    />
  );
}
