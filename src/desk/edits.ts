import type {
  EditRefusal,
  GedcomLanguageService,
  Position,
  StructureEditResult,
  StructureFieldDescription,
  StructureInput,
  StructureValueInput,
  WorkspaceEdit,
} from "@domorium/language-service";

import { CATALOGUES, currentLanguage, plural, t, type MessageKey } from "../i18n";

export interface Refusal {
  ok: false;
  code: string;
  message: string;
}

/** What a write the card asked for came to: the first line it wrote and the service's warnings, or why nothing was written. */
export type WriteOutcome = { ok: true; line: number; warnings: string[] } | Refusal;

/** The tab a write lands in: its service, read from the text as it is now, and a way to apply an edit as one change. */
export interface EditTarget {
  service(): GedcomLanguageService;
  apply(edit: WorkspaceEdit): boolean;
}

export const STALE = "stale-document";

export function setValueAt(
  service: GedcomLanguageService,
  at: Position,
  version: number,
  input: StructureValueInput,
): StructureEditResult | EditRefusal {
  return service.setValue(at, input, version);
}

export function addAt(
  service: GedcomLanguageService,
  parent: Position,
  version: number,
  tag: string,
  input: StructureInput,
): StructureEditResult | EditRefusal {
  return service.addStructure(parent, tag, input, version);
}

export function removeAt(
  service: GedcomLanguageService,
  at: Position,
  version: number,
): StructureEditResult | EditRefusal {
  return service.removeStructure(at, version);
}

/** Applies what the service answered, or says why it was not; an edit the tab no longer matches is refused as stale. */
export function commit(target: EditTarget, result: StructureEditResult | EditRefusal): WriteOutcome {
  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }
  if (!target.apply(result.edit)) {
    return { ok: false, code: STALE, message: "The document changed before the edit could be applied." };
  }
  return {
    ok: true,
    line: Math.min(...result.edit.edits.map((edit) => edit.range.start.line)),
    warnings: result.warnings.map((warning) => warning.message),
  };
}

/** The first problem the service finds with a value before it is written, where it would refuse it. */
export function checkValue(
  service: GedcomLanguageService,
  at: Position,
  tag: string,
  input: StructureValueInput,
  replacing = false,
): Refusal | null {
  const checked = service.validateValue(at, tag, input, { replacing });
  if (!checked.ok) {
    return { ok: false, code: checked.code, message: checked.message };
  }
  const problem = checked.problems.find((one) => one.severity === "error");
  return problem ? { ok: false, code: problem.code, message: problem.message } : null;
}

/** How a field chosen in the menu is added: written at once, through the list of records, or as an unwritten row. */
export type AddPlan = { kind: "now"; input: StructureInput } | { kind: "pointer" } | { kind: "row" };

export function addPlan(field: StructureFieldDescription, as: "text" | "pointer" = "text"): AddPlan {
  const { kind } = field.payload;
  if (kind === "pointer" || (kind === "text-or-pointer" && as === "pointer")) {
    return { kind: "pointer" };
  }
  if (kind === "none") {
    return { kind: "now", input: {} };
  }
  if (kind === "boolean") {
    return { kind: "now", input: { value: "Y" } };
  }
  return { kind: "row" };
}

/** The lines the standard requires beneath a new field, which an unwritten row asks for before it is written. */
export function requiredBeneath(service: GedcomLanguageService, field: StructureFieldDescription): StructureFieldDescription[] {
  const described = service.describeSchemaPath(field.id);
  return "ok" in described ? [] : described.fields.filter((one) => one.required);
}

const MULTI_LINE: ReadonlySet<string> = new Set(["NOTE", "SNOTE", "TEXT"]);

export const takesLines = (tag: string): boolean => MULTI_LINE.has(tag);

/** A value as it is written: the service writes a line break as `CONT` under any tag, so one is a space outside a note or a text. */
export function writtenValue(tag: string, text: string): string {
  return takesLines(tag) ? text : text.replace(/\r\n?|\n/g, " ");
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function noSuchDay(message: string): { date: string; month: string; count: number } | null {
  const found = /names (\d{1,2}) ([A-Z]{3}), and \2 has (\d+) days/.exec(message);
  const at = MONTHS.indexOf(found?.[2] ?? "");
  if (!found || at < 0) {
    return null;
  }
  const language = currentLanguage();
  const first = new Date(2000, at, 1);
  const date = new Intl.DateTimeFormat(language, { day: "numeric", month: "long" })
    .formatToParts(first)
    .map((part) => (part.type === "day" ? found[1] : part.value))
    .join("");
  const month = new Intl.DateTimeFormat(language, { month: "long" }).format(first);
  return { date, month, count: Number(found[3]) };
}

/** Why a value was not written, in the reader's language where the plugin has words for the code, in the service's otherwise. */
export function refusalText(refusal: Pick<Refusal, "code" | "message">): string {
  const day = refusal.code === "payload-datatype" ? noSuchDay(refusal.message) : null;
  if (day) {
    return plural("edit.refusal.noSuchDay", day.count, { date: day.date, month: day.month });
  }
  const key = `edit.refusal.${refusal.code}`;
  return key in CATALOGUES.en ? t(key as MessageKey) : refusal.message;
}
