/**
 * hijri-tabular.ts — pure tabular Islamic (Hijri) calendar math.
 *
 * No imports and no network, so it is safe to use from BOTH the service
 * worker (src/sw.js — Islamic event detection) and the main app (offline
 * fallback in islamic-calendar-service). One shared implementation prevents
 * the two from drifting apart, which is exactly what happened before: the
 * service worker used a linear year-estimate while the app used this tabular
 * math, and the two disagreed by a day — and by a whole year after 2026.
 *
 * Accuracy: matches the moon-sighting calendar for most dates and drifts
 * ±1 day in some periods — inherent to tabular calendars (the app corrects
 * this whenever the Aladhan gToH API is reachable).
 *
 * Epoch: Friday, July 16, 622 CE (Julian) = JDN 1948439.5. Do NOT "fix" this
 * by switching to the civil-epoch variant (1948443.5): it was tested against
 * api.aladhan.com and matched 0/18 dates (the astronomical epoch matched 12).
 */

export interface HijriDate {
  year: number;
  month: number; // 1–12 (1 = Muharram, 9 = Ramadan, 10 = Shawwal, 12 = Dhul Hijjah)
  day: number; // 1–30
}

const HIJRI_EPOCH_JDN = 1948439.5;

export function isHijriLeapYear(year: number): boolean {
  // In the 30-year cycle, years 2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29 are leap
  const cyclePosition = year % 30;
  return [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29].includes(cyclePosition);
}

export function getHijriMonthLength(month: number, year: number): number {
  if (month % 2 === 1) return 30; // Odd months: 30 days
  if (month === 12) return isHijriLeapYear(year) ? 30 : 29;
  return 29; // Even months (except leap Dhul-Hijjah): 29 days
}

/** Gregorian → Julian Day Number (local time). */
export function getJulianDayNumber(date: Date): number {
  const a = Math.floor((14 - (date.getMonth() + 1)) / 12);
  const y = date.getFullYear() + 4800 - a;
  const m = date.getMonth() + 1 + 12 * a - 3;

  return (
    date.getDate() +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** Convert a Gregorian date to its tabular Hijri date. */
export function toHijri(date: Date): HijriDate {
  const daysSinceEpoch = Math.floor(getJulianDayNumber(date) - HIJRI_EPOCH_JDN);
  const yearLength = (y: number) => (isHijriLeapYear(y) ? 355 : 354);

  // Find the Hijri year by walking forward from the epoch
  let year = 1;
  let accumulatedDays = 0;
  while (accumulatedDays + yearLength(year) <= daysSinceEpoch) {
    accumulatedDays += yearLength(year);
    year++;
  }

  const dayOfYear = daysSinceEpoch - accumulatedDays;

  // Find the month within the year
  let month = 1;
  let monthStart = 1;
  for (let m = 1; m <= 12; m++) {
    const ml = getHijriMonthLength(m, year);
    if (dayOfYear < monthStart + ml - 1) {
      month = m;
      break;
    }
    monthStart += ml;
  }

  return { year, month, day: dayOfYear - monthStart + 2 };
}

/**
 * Days until the next occurrence of a Hijri month/day (0 = today, -1 = not
 * found within ~1 Hijri year — should never happen). Used for the Ramadan
 * countdown; walking forward keeps this correct across month-length
 * irregularities instead of estimating month lengths.
 */
export function getDaysUntilHijriDate(date: Date, targetMonth: number, targetDay: number): number {
  const today = toHijri(date);
  if (today.month === targetMonth && today.day === targetDay) return 0;

  for (let i = 1; i <= 370; i++) {
    const d = new Date(date);
    d.setDate(d.getDate() + i);
    const h = toHijri(d);
    if (h.month === targetMonth && h.day === targetDay) return i;
  }
  return -1;
}
