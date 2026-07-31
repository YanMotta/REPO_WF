export interface BusinessDayOptions {
  /** Extra holiday dates (UTC midnight) to treat as non-business days, beyond the national calendar. */
  extraHolidays?: Date[];
}

export class BusinessDayRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessDayRangeError';
  }
}

function utcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

function toDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
}

/** Easter Sunday (Gregorian calendar) via the Meeus/Jones/Butcher algorithm. */
export function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utcDate(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** Fixed and movable Brazilian national holidays for a given year. */
export function getBrazilianHolidays(year: number): Date[] {
  const easter = easterDate(year);
  return [
    utcDate(year, 0, 1), // Confraternização Universal
    utcDate(year, 3, 21), // Tiradentes
    utcDate(year, 4, 1), // Dia do Trabalho
    utcDate(year, 8, 7), // Independência do Brasil
    utcDate(year, 9, 12), // Nossa Senhora Aparecida
    utcDate(year, 10, 2), // Finados
    utcDate(year, 10, 15), // Proclamação da República
    utcDate(year, 11, 25), // Natal
    addDays(easter, -47), // Carnaval
    addDays(easter, -2), // Sexta-feira Santa
    addDays(easter, 60), // Corpus Christi
  ];
}

export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export function isBusinessDay(date: Date, holidays: Date[]): boolean {
  if (isWeekend(date)) return false;
  const key = toDateKey(date);
  return !holidays.some((h) => toDateKey(h) === key);
}

function businessDaysInMonth(year: number, month: number, options?: BusinessDayOptions): Date[] {
  const holidays = [...getBrazilianHolidays(year), ...(options?.extraHolidays ?? [])];
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days: Date[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = utcDate(year, month - 1, d);
    if (isBusinessDay(date, holidays)) days.push(date);
  }
  return days;
}

/**
 * Resolves the Nth business day of a month.
 * `offset` positive counts from the start of the month (1 = first business day, 2 = second, ...).
 * `offset` negative counts from the end of the month (-1 = last business day, -2 = second-to-last, ...).
 * Throws if `offset === 0` or `abs(offset)` exceeds the number of business days in the month.
 */
export function getNthBusinessDay(
  year: number,
  month: number,
  offset: number,
  options?: BusinessDayOptions,
): Date {
  if (offset === 0) {
    throw new BusinessDayRangeError('businessDayOffset cannot be 0');
  }
  const days = businessDaysInMonth(year, month, options);
  if (Math.abs(offset) > days.length) {
    throw new BusinessDayRangeError(
      `offset ${offset} exceeds the ${days.length} business day(s) available in ${year}-${month}`,
    );
  }
  return offset > 0 ? days[offset - 1] : days[days.length + offset];
}

/**
 * Parses a "YYYY-MM-DD" date-only string as LOCAL midnight.
 * `new Date("2026-07-03")` parses as UTC midnight per the ECMA-262 date-only-string rule, which is
 * the previous calendar day in any timezone behind UTC (e.g. America/Sao_Paulo, this project's
 * home timezone) — a footgun for calendar-day concepts like business-day rules. Use this instead
 * whenever a date-only string needs to become a real Date anchored to the intended local day.
 */
export function parseLocalDateOnly(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Same as getNthBusinessDay but returns an ISO date string ("YYYY-MM-DD") or null instead of throwing. */
export function resolveBusinessDayOffset(
  offset: number,
  year: number,
  month: number,
  options?: BusinessDayOptions,
): string | null {
  try {
    const date = getNthBusinessDay(year, month, offset, options);
    return date.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}
