import {
  YEARLY_LOOKAHEAD,
  eventKey,
  generateAnniversaryOccurrences,
  monthsTogether,
  occurrenceKey,
  yearsTogether,
} from '../anniversaryEvents';

/** Local-midnight Date for a "YYYY-MM-DD"-ish (month is 1-indexed here). */
function d(year: number, month1: number, day: number): Date {
  return new Date(year, month1 - 1, day);
}

describe('yearsTogether / monthsTogether', () => {
  it('counts whole years, decrementing before the anniversary', () => {
    const start = d(2020, 6, 15);
    expect(yearsTogether(start, d(2023, 6, 15))).toBe(3); // on the day
    expect(yearsTogether(start, d(2023, 6, 14))).toBe(2); // day before
    expect(yearsTogether(start, d(2020, 12, 1))).toBe(0);
  });

  it('counts whole months, decrementing before the day-of-month', () => {
    const start = d(2025, 1, 20);
    expect(monthsTogether(start, d(2025, 4, 20))).toBe(3);
    expect(monthsTogether(start, d(2025, 4, 19))).toBe(2);
    expect(monthsTogether(start, d(2025, 1, 25))).toBe(0);
  });
});

describe('generateAnniversaryOccurrences — under 1 year (monthly)', () => {
  it('generates upcoming monthiversaries through the 1-year mark', () => {
    // Started 2025-01-10; "today" is 2025-03-15 → next is month 3 (Apr 10).
    const occ = generateAnniversaryOccurrences('2025-01-10', d(2025, 3, 15));
    const dates = occ.map((o) => o.eventDate);

    // Months 3..11 as monthiversaries, then month 12 as the 1-year anniversary.
    expect(dates[0]).toBe('2025-04-10'); // 3-month
    expect(occ[0].title).toBe('3-Month Anniversary 💛');
    expect(occ[0].cadence).toBe('monthly');

    // The final occurrence is the 1-year anniversary.
    const last = occ[occ.length - 1];
    expect(last.eventDate).toBe('2026-01-10');
    expect(last.title).toBe('1-Year Anniversary 💛');
    expect(last.cadence).toBe('yearly');
    expect(last.count).toBe(1);
  });

  it('includes a monthiversary that falls exactly today', () => {
    // Started 2025-01-10; today is the 2-month mark (2025-03-10).
    const occ = generateAnniversaryOccurrences('2025-01-10', d(2025, 3, 10));
    expect(occ[0].eventDate).toBe('2025-03-10');
    expect(occ[0].title).toBe('2-Month Anniversary 💛');
  });

  it('clamps a 31st start to shorter months', () => {
    // Started Jan 31; the 1-month mark is Feb, which has no 31st → Feb 28.
    const occ = generateAnniversaryOccurrences('2025-01-31', d(2025, 1, 31));
    const feb = occ.find((o) => o.title === '1-Month Anniversary 💛');
    expect(feb?.eventDate).toBe('2025-02-28');
  });

  it('returns [] for a missing start date', () => {
    expect(generateAnniversaryOccurrences(null, d(2025, 3, 15))).toEqual([]);
    expect(generateAnniversaryOccurrences(undefined, d(2025, 3, 15))).toEqual([]);
  });
});

describe('generateAnniversaryOccurrences — 1 year or more (yearly)', () => {
  it('generates the next few yearly anniversaries', () => {
    // Started 2020-06-15; today 2023-08-01 → 3 years in, next is year 4.
    const occ = generateAnniversaryOccurrences('2020-06-15', d(2023, 8, 1));

    expect(occ).toHaveLength(YEARLY_LOOKAHEAD);
    expect(occ[0]).toMatchObject({
      eventDate: '2024-06-15',
      title: '4-Year Anniversary 💛',
      count: 4,
      cadence: 'yearly',
    });
    expect(occ[YEARLY_LOOKAHEAD - 1].eventDate).toBe(
      `${2024 + YEARLY_LOOKAHEAD - 1}-06-15`,
    );
  });

  it('includes this year’s anniversary when it is still upcoming', () => {
    // Started 2020-06-15; today is before this year's anniversary.
    const occ = generateAnniversaryOccurrences('2020-06-15', d(2023, 3, 1));
    // 2 whole years in (before the 3rd anniversary) → next is the 3-year.
    expect(occ[0]).toMatchObject({
      eventDate: '2023-06-15',
      title: '3-Year Anniversary 💛',
      count: 3,
    });
  });
});

describe('dedupe keys', () => {
  it('occurrenceKey and eventKey agree for the same date+title', () => {
    const occ = generateAnniversaryOccurrences('2020-06-15', d(2023, 8, 1))[0];
    const event = { eventDate: `${occ.eventDate}T00:00:00`, title: occ.title };
    expect(eventKey(event)).toBe(occurrenceKey(occ));
  });

  it('is case- and whitespace-insensitive on the title', () => {
    const a = occurrenceKey({ eventDate: '2025-04-10', title: '3-Month Anniversary 💛' });
    const b = eventKey({ eventDate: '2025-04-10', title: '  3-month anniversary 💛 ' });
    expect(a).toBe(b);
  });
});
