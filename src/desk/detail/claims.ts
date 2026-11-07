import type { RecordLine } from "../../genealogy";
import { PERSON_EVENT_TAGS } from "../../genealogy/tags";

/** The lines of a record with one of these tags, in the order the record writes them. */
export function linesWith(record: RecordLine, tags: ReadonlySet<string>): RecordLine[] {
  return record.children.filter((line) => tags.has(line.tag));
}

/** The lines of a record that none of the sections drew for themselves, for Other data. */
export function unclaimed(record: RecordLine, claimed: ReadonlySet<string>, keep: (line: RecordLine) => boolean = () => false): RecordLine[] {
  return record.children.filter((line) => !claimed.has(line.tag) || keep(line));
}

export const NOTE_TAGS: ReadonlySet<string> = new Set(["NOTE", "SNOTE"]);
export const RELATED_TAGS: ReadonlySet<string> = new Set(["ASSO", "ALIA"]);
export const INFO_TAGS: ReadonlySet<string> = new Set([
  "REFN", "UID", "EXID", "AFN", "RIN", "RESN", "CREA", "CHAN", "SUBM", "ANCI", "DESI",
]);

/** What a person card draws itself, so that the rest of a person's lines go to Other data. */
export const PERSON_CLAIMED: ReadonlySet<string> = new Set([
  "NAME", "SEX", "FAMC", "FAMS", "SOUR", "OBJE", ...NOTE_TAGS, ...RELATED_TAGS, ...INFO_TAGS, ...PERSON_EVENT_TAGS,
]);
