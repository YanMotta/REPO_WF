import dayjs from 'dayjs';
import { ActivityDto } from '@workflow-brasal/shared';
import {
  FALLBACK_LEAD_DAYS,
  MIN_BAR_WIDTH_PX,
  MONTH_ABBREVIATIONS,
  RANGE_PADDING_DAYS,
  ZoomLevel,
} from './gantt.constants';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface BarGeometry {
  left: number;
  width: number;
}

export interface Gridline {
  x: number;
  label: string;
  isMonthBoundary: boolean;
}

export interface Point {
  x: number;
  y: number;
}

/** startDate if present, else deadline minus a short lead-in — rendering-only fallback, never
 * written back. Returns null when there's no deadline either (nothing to position). */
export function getEffectiveStart(activity: ActivityDto): Date | null {
  if (!activity.deadline) return null;
  if (activity.startDate) return dayjs(activity.startDate).startOf('day').toDate();
  return dayjs(activity.deadline).startOf('day').subtract(FALLBACK_LEAD_DAYS, 'day').toDate();
}

export function getEffectiveEnd(activity: ActivityDto): Date | null {
  if (!activity.deadline) return null;
  return dayjs(activity.deadline).startOf('day').toDate();
}

/** Bounds the visible timeline to the span of the given (already-filtered) activities, so
 * narrowing filters naturally tightens the window instead of always showing everything ever
 * created. Returns null when none of the activities have a usable date. */
export function computeVisibleDateRange(activities: ActivityDto[]): DateRange | null {
  let start: Date | null = null;
  let end: Date | null = null;

  for (const activity of activities) {
    const s = getEffectiveStart(activity);
    const e = getEffectiveEnd(activity);
    if (!s || !e) continue;
    if (!start || s < start) start = s;
    if (!end || e > end) end = e;
  }

  if (!start || !end) return null;

  return {
    start: dayjs(start).subtract(RANGE_PADDING_DAYS, 'day').toDate(),
    end: dayjs(end).add(RANGE_PADDING_DAYS, 'day').toDate(),
  };
}

export function dateToX(date: Date, rangeStart: Date, pxPerDay: number): number {
  const days = dayjs(date).startOf('day').diff(dayjs(rangeStart).startOf('day'), 'day');
  return days * pxPerDay;
}

/** Left/width in pixels for an activity's bar, or null if it has no deadline (nothing to draw). */
export function computeBarGeometry(
  activity: ActivityDto,
  rangeStart: Date,
  pxPerDay: number,
): BarGeometry | null {
  const start = getEffectiveStart(activity);
  const end = getEffectiveEnd(activity);
  if (!start || !end) return null;

  const left = dateToX(start, rangeStart, pxPerDay);
  const width = Math.max(dateToX(end, rangeStart, pxPerDay) - left, MIN_BAR_WIDTH_PX);
  return { left, width };
}

function mondayOfWeek(date: dayjs.Dayjs): dayjs.Dayjs {
  const dayOfWeek = date.day(); // 0=Sunday..6=Saturday
  const offsetFromMonday = (dayOfWeek + 6) % 7;
  return date.subtract(offsetFromMonday, 'day');
}

/** Gridline positions + labels for the timeline header, granularity depending on zoom level.
 * Pure function of the visible range — recomputed only when range/zoom/pxPerDay change. */
export function computeGridlines(
  rangeStart: Date,
  rangeEnd: Date,
  zoomLevel: ZoomLevel,
  pxPerDay: number,
): Gridline[] {
  const lines: Gridline[] = [];
  const end = dayjs(rangeEnd).startOf('day');

  if (zoomLevel === 'day') {
    let cursor = dayjs(rangeStart).startOf('day');
    while (cursor.valueOf() <= end.valueOf()) {
      const isFirstOfMonth = cursor.date() === 1;
      lines.push({
        x: dateToX(cursor.toDate(), rangeStart, pxPerDay),
        label: isFirstOfMonth ? `${cursor.date()} ${MONTH_ABBREVIATIONS[cursor.month()]}` : String(cursor.date()),
        isMonthBoundary: isFirstOfMonth,
      });
      cursor = cursor.add(1, 'day');
    }
    return lines;
  }

  if (zoomLevel === 'week') {
    let cursor = mondayOfWeek(dayjs(rangeStart));
    while (cursor.valueOf() <= end.valueOf()) {
      lines.push({
        x: dateToX(cursor.toDate(), rangeStart, pxPerDay),
        label: `${cursor.date()} ${MONTH_ABBREVIATIONS[cursor.month()]}`,
        isMonthBoundary: cursor.date() <= 7,
      });
      cursor = cursor.add(1, 'week');
    }
    return lines;
  }

  if (zoomLevel === 'month') {
    let cursor = dayjs(rangeStart).startOf('month');
    while (cursor.valueOf() <= end.valueOf()) {
      lines.push({
        x: dateToX(cursor.toDate(), rangeStart, pxPerDay),
        label: `${MONTH_ABBREVIATIONS[cursor.month()]} ${cursor.year()}`,
        isMonthBoundary: true,
      });
      cursor = cursor.add(1, 'month');
    }
    return lines;
  }

  // quarter — step by 3 months from a quarter-aligned start, avoiding dayjs's quarter plugin.
  let cursor = dayjs(rangeStart).startOf('month');
  cursor = cursor.month(Math.floor(cursor.month() / 3) * 3);
  while (cursor.valueOf() <= end.valueOf()) {
    const quarterNumber = Math.floor(cursor.month() / 3) + 1;
    lines.push({
      x: dateToX(cursor.toDate(), rangeStart, pxPerDay),
      label: `Q${quarterNumber} ${cursor.year()}`,
      isMonthBoundary: true,
    });
    cursor = cursor.add(3, 'month');
  }
  return lines;
}

/** Orthogonal ("elbow") connector: right out of the predecessor, vertical to the dependent's
 * row, then right into it — the standard Gantt dependency-arrow shape. */
export function computeConnectorPath(from: Point, to: Point): string {
  const midX = from.x + Math.max((to.x - from.x) / 2, 12);
  return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
}
