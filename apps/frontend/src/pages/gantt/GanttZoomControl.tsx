import { SegmentedControl } from '@mantine/core';
import { ZOOM_OPTIONS, ZoomLevel } from './gantt.constants';

export function GanttZoomControl({ value, onChange }: { value: ZoomLevel; onChange: (zoom: ZoomLevel) => void }) {
  return (
    <SegmentedControl
      value={value}
      onChange={(next) => onChange(next as ZoomLevel)}
      data={ZOOM_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
    />
  );
}
