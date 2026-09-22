/** How exactly a payload stated the year that was read from it. */
export type DatePrecision = "exact" | "approximate" | "range";

/**
 * A date as the record writes it, and a year read from it where one could be
 * read plainly.
 *
 * The year is a reading for display and is deliberately not named as the year
 * an event happened: `BET 1867 AND 1870` yields 1867, which is one end of a
 * range and not anyone's birth year. A caller comparing two people must look
 * at `precision` before treating a year as a fact.
 */
export interface DateReading {
  /** The payload exactly as the file wrote it. */
  text: string;
  year?: number;
  precision?: DatePrecision;
}

/** A calendar escape, or two years for one date: neither yields a year here. */
const OTHER_CALENDAR = /@#D/u;
const DUAL_YEAR = /\d{4}\/\d{1,4}/u;

const APPROXIMATE = /^(ABT|CAL|EST)\b/iu;
const RANGE = /^(BET|BEF|AFT|FROM|TO)\b/iu;

const FOUR_DIGITS = /\b(\d{4})\b/u;

export function readDate(payload: string | undefined): DateReading {
  const text = payload ?? "";
  const trimmed = text.trim();
  if (!trimmed || OTHER_CALENDAR.test(trimmed) || DUAL_YEAR.test(trimmed)) {
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
