import type { DateModifier, GedcomDateValue } from "@domorium/language-service";

export type DatePrecision = "exact" | "approximate" | "range";

/**
 * The year is for display and is deliberately not named as the year an event
 * happened: `BET 1867 AND 1870` yields 1867, one end of a range and nobody's
 * birth year. A caller comparing two people must read `precision` first.
 *
 * A year before the common era is astronomical, `1 − written`, so that it
 * orders and subtracts like any other.
 */
export interface DateReading {
  text: string;
  year?: number;
  precision?: DatePrecision;
}

// A Julian year is used as written: the calendars differ by days, not years.
const PLACED_CALENDARS = new Set(["GREGORIAN", "JULIAN"]);

export function readingOf(
  payload: string,
  value: GedcomDateValue | null,
): DateReading {
  const first = value?.dates[0];
  if (
    !value ||
    !first ||
    !PLACED_CALENDARS.has(first.calendar) ||
    (first.epoch !== undefined && first.epoch !== "BCE") ||
    first.year === 0
  ) {
    return { text: payload };
  }
  const written = first.dualYear ?? first.year;
  return {
    text: payload,
    year: first.epoch === "BCE" ? 1 - written : written,
    precision: precisionOf(value.modifier),
  };
}

function precisionOf(modifier: DateModifier | undefined): DatePrecision {
  switch (modifier) {
    case "ABT":
    case "CAL":
    case "EST":
      return "approximate";
    case "BET":
    case "BEF":
    case "AFT":
    case "FROM":
    case "TO":
      return "range";
    default:
      return "exact";
  }
}
