import type {
  DateModifier,
  GedcomDate,
  GedcomDateValue,
} from "@domorium/language-service";

export type DatePrecision = "exact" | "approximate" | "range";

/**
 * The year is for display and is deliberately not named as the year an event
 * happened: `BET 1867 AND 1870` yields 1867, one end of a range and nobody's
 * birth year. A caller comparing two people must read `precision` first.
 *
 * A year before the common era is astronomical, `1 − written`, so that it
 * orders and subtracts like any other.
 *
 * `end` is the year of the second date of `BET … AND …` and `FROM … TO …`, in
 * the order the file writes it, even where it is the earlier. `period` tells
 * `FROM` and `TO`, a stretch of time, from `BET`, `BEF` and `AFT`, a moment
 * not known exactly, which share the precision `range`.
 */
export interface DateReading {
  text: string;
  year?: number;
  precision?: DatePrecision;
  end?: number;
  period?: true;
}

// A Julian year is used as written: the calendars differ by days, not years.
const PLACED_CALENDARS = new Set(["GREGORIAN", "JULIAN"]);

export function readingOf(
  payload: string,
  value: GedcomDateValue | null,
): DateReading {
  const year = value ? yearOf(value.dates[0]) : undefined;
  if (!value || year === undefined) {
    return { text: payload };
  }
  const reading: DateReading = {
    text: payload,
    year,
    precision: precisionOf(value.modifier),
  };
  const end = yearOf(value.dates[1]);
  if (end !== undefined) {
    reading.end = end;
  }
  if (value.modifier === "FROM" || value.modifier === "TO") {
    reading.period = true;
  }
  return reading;
}

function yearOf(date: GedcomDate | undefined): number | undefined {
  if (
    !date ||
    !PLACED_CALENDARS.has(date.calendar) ||
    (date.epoch !== undefined && date.epoch !== "BCE") ||
    date.year === 0
  ) {
    return undefined;
  }
  const written = date.dualYear ?? date.year;
  return date.epoch === "BCE" ? 1 - written : written;
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
