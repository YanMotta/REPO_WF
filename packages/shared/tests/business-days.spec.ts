import {
  BusinessDayRangeError,
  easterDate,
  getBrazilianHolidays,
  getNthBusinessDay,
  parseLocalDateOnly,
  resolveBusinessDayOffset,
} from '../src/business-days/business-days';

describe('easterDate', () => {
  it('matches known Easter Sundays', () => {
    // Verified against published Brazilian holiday calendars.
    expect(easterDate(2024).toISOString().slice(0, 10)).toBe('2024-03-31');
    expect(easterDate(2025).toISOString().slice(0, 10)).toBe('2025-04-20');
    expect(easterDate(2026).toISOString().slice(0, 10)).toBe('2026-04-05');
  });
});

describe('getBrazilianHolidays', () => {
  it('includes fixed national holidays', () => {
    const keys = getBrazilianHolidays(2026).map((d) => d.toISOString().slice(0, 10));
    expect(keys).toContain('2026-01-01');
    expect(keys).toContain('2026-04-21');
    expect(keys).toContain('2026-05-01');
    expect(keys).toContain('2026-09-07');
    expect(keys).toContain('2026-10-12');
    expect(keys).toContain('2026-11-02');
    expect(keys).toContain('2026-11-15');
    expect(keys).toContain('2026-12-25');
  });

  it('includes movable holidays derived from Easter', () => {
    // 2026 Easter is 2026-04-05.
    const keys = getBrazilianHolidays(2026).map((d) => d.toISOString().slice(0, 10));
    expect(keys).toContain('2026-02-17'); // Carnaval (Easter - 47)
    expect(keys).toContain('2026-04-03'); // Sexta-feira Santa (Easter - 2)
    expect(keys).toContain('2026-06-04'); // Corpus Christi (Easter + 60)
  });
});

describe('getNthBusinessDay', () => {
  it('resolves the first business day of a month counting from the start', () => {
    // January 2026: Jan 1 is a holiday (Thursday), so first business day is Jan 2.
    const first = getNthBusinessDay(2026, 1, 1);
    expect(first.toISOString().slice(0, 10)).toBe('2026-01-02');
  });

  it('resolves the last business day of a month counting from the end', () => {
    // January 2026: Jan 31 is a Saturday, Jan 30 is Friday -> last business day.
    const last = getNthBusinessDay(2026, 1, -1);
    expect(last.toISOString().slice(0, 10)).toBe('2026-01-30');
  });

  it('resolves the second-to-last business day', () => {
    const secondToLast = getNthBusinessDay(2026, 1, -2);
    expect(secondToLast.toISOString().slice(0, 10)).toBe('2026-01-29');
  });

  it('throws when offset is 0', () => {
    expect(() => getNthBusinessDay(2026, 1, 0)).toThrow(BusinessDayRangeError);
  });

  it('throws when offset exceeds the business days available in the month', () => {
    expect(() => getNthBusinessDay(2026, 1, 100)).toThrow(BusinessDayRangeError);
    expect(() => getNthBusinessDay(2026, 1, -100)).toThrow(BusinessDayRangeError);
  });
});

describe('resolveBusinessDayOffset', () => {
  it('returns an ISO date string for a valid offset', () => {
    expect(resolveBusinessDayOffset(1, 2026, 1)).toBe('2026-01-02');
  });

  it('returns null instead of throwing for offset 0', () => {
    expect(resolveBusinessDayOffset(0, 2026, 1)).toBeNull();
  });

  it('returns null instead of throwing for an out-of-range offset', () => {
    expect(resolveBusinessDayOffset(100, 2026, 1)).toBeNull();
  });
});

describe('parseLocalDateOnly', () => {
  it('anchors to local midnight, matching the calendar date regardless of timezone', () => {
    const date = parseLocalDateOnly('2026-07-03');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6); // July, 0-indexed
    expect(date.getDate()).toBe(3);
    expect(date.getHours()).toBe(0);
  });
});
