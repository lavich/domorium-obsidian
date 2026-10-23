export type DatePrecision = "exact" | "approximate" | "range";

/**
 * The year is for display and is deliberately not named as the year an event
 * happened: `BET 1867 AND 1870` yields 1867, one end of a range and nobody's
 * birth year. A caller comparing two people must read `precision` first.
 */
export interface DateReading {
  text: string;
  year?: number;
  precision?: DatePrecision;
}

// 5.5.1 names a calendar in an escape, 7.0 by a keyword; either way the year
// is not one a reader would place on a Gregorian timeline.
const OTHER_CALENDAR = /@#D|\b(JULIAN|HEBREW|FRENCH_R)\b/iu;
// A year before the common era would read, and sort, as one after it.
const BEFORE_COMMON_ERA = /\b(BCE|B\.C\.)(?=\s|$)/iu;
const DUAL_YEAR = /\d{4}\/\d{1,4}/u;

const APPROXIMATE = /^(ABT|CAL|EST)\b/iu;
const RANGE = /^(BET|BEF|AFT|FROM|TO)\b/iu;

const FOUR_DIGITS = /\b(\d{4})\b/u;

export function readDate(payload: string | undefined): DateReading {
  const text = payload ?? "";
  const trimmed = text.trim();
  if (
    !trimmed ||
    OTHER_CALENDAR.test(trimmed) ||
    BEFORE_COMMON_ERA.test(trimmed) ||
    DUAL_YEAR.test(trimmed)
  ) {
    return { text };
  }
  const found = FOUR_DIGITS.exec(trimmed);
  if (!found) {
    return { text };
  }
  return {
    text,
    year: Number(found[1]),
    precision: precisionOf(trimmed),
  };
}

function precisionOf(trimmed: string): DatePrecision {
  if (APPROXIMATE.test(trimmed)) {
    return "approximate";
  }
  return RANGE.test(trimmed) ? "range" : "exact";
}
