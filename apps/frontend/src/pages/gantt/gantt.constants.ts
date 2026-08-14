export type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';

export const DEFAULT_ZOOM: ZoomLevel = 'week';

/** Hand-tuned pixel density per zoom level — fixed, not "fit to width", since horizontal
 * scroll/pan across the timeline is a required interaction, not something to avoid via scaling. */
export const ZOOM_PX_PER_DAY: Record<ZoomLevel, number> = {
  day: 40,
  week: 16,
  month: 6,
  quarter: 2.5,
};

export const ROW_HEIGHT = 32;
export const PROJECT_HEADER_HEIGHT = 40;
export const LABEL_COLUMN_WIDTH = 280;
export const LABEL_COLUMN_WIDTH_MOBILE = 150;
export const MIN_BAR_WIDTH_PX = 8;
/** Activities with no startDate default to a short lead-in window ending at the deadline —
 * just enough to render a visible, position-meaningful bar (same convention the app has used
 * before for this exact gap). Rendering-only; never persisted. */
export const FALLBACK_LEAD_DAYS = 3;
/** Padding added on each side of the computed date range so edge bars aren't flush against the
 * timeline header. */
export const RANGE_PADDING_DAYS = 2;

export const MONTH_ABBREVIATIONS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];
