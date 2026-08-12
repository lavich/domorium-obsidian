import {
  GedcomLanguageService,
  type Position,
  type WorkspaceEdit,
} from "@domorium/language-service";

import { relativeToDocument } from "../editor/service";

const GEDCOM_EXTENSIONS = ["ged", "gedcom"];

export function isGedcomPath(path: string): boolean {
  const dot = path.lastIndexOf(".");
  return dot > 0 && GEDCOM_EXTENSIONS.includes(path.slice(dot + 1).toLowerCase());
}

/**
 * Every media payload sits on a line whose tag is FILE, so a file without the
 * word cannot hold one. Parsing a 50MB export to learn that takes seconds, on
 * the thread the interface is drawn from, for every rename in the vault.
 */
export function mayNameAFile(text: string): boolean {
  return text.includes("FILE");
}

/**
 * For a file no view is showing. An open one is edited through its editor, so
 * that the rewrite lands in the undo history the user can reach.
 */
export function applyEdits(text: string, edit: WorkspaceEdit): string {
  const lineStarts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") {
      lineStarts.push(index + 1);
    }
  }
  const offsetOf = (position: Position): number =>
    (lineStarts[position.line] ?? text.length) + position.character;

  return [...edit.edits]
    .sort(
      (left, right) => offsetOf(right.range.start) - offsetOf(left.range.start),
    )
    .reduce(
      (result, { range, newText }) =>
        result.slice(0, offsetOf(range.start)) +
        newText +
        result.slice(offsetOf(range.end)),
      text,
    );
}

export interface Retarget {
  text: string;
  count: number;
  /** Payloads named the file, but its new place has no legal spelling here. */
  stranded: number;
}

export function planRetarget(
  service: GedcomLanguageService,
  documentPath: string,
  from: string,
  to: string,
): { edit: WorkspaceEdit; stranded: number } {
  const oldPath = relativeToDocument(documentPath, from);
  const newPath = relativeToDocument(documentPath, to);
  const resolution = service.getVersionResolution();
  const gedcom7 =
    resolution !== undefined &&
    "dialect" in resolution &&
    resolution.dialect === "7.0";

  // A GEDCOM 7 payload is a URI reference that may not leave the folder its
  // file is in, so a photo moved above that folder has no payload to move to.
  if (gedcom7 && newPath.split("/").includes("..")) {
    const naming = service.retargetFileLinks(oldPath, oldPath);
    return {
      edit: { version: naming.version, edits: [] },
      stranded: naming.edits.length,
    };
  }
  return { edit: service.retargetFileLinks(oldPath, newPath), stranded: 0 };
}

export function retargetMedia(
  text: string,
  documentPath: string,
  from: string,
  to: string,
): Retarget {
  const { edit, stranded } = planRetarget(
    new GedcomLanguageService(text),
    documentPath,
    from,
    to,
  );
  return {
    text: edit.edits.length === 0 ? text : applyEdits(text, edit),
    count: edit.edits.length,
    stranded,
  };
}

export function describeRetarget(payloads: number, files: number): string {
  return `GEDCOM: repointed ${count(payloads, "media link")} in ${count(files, "file")}`;
}

export function describeUnreadable(files: number): string {
  return `GEDCOM: could not check ${count(files, "file")} for links to the renamed file`;
}

export function describeStranded(payloads: number): string {
  return `GEDCOM: left ${count(payloads, "media link")} pointing at the old path — GEDCOM 7 cannot name a file outside the folder its own file is in`;
}

function count(amount: number, noun: string): string {
  return `${amount} ${noun}${amount === 1 ? "" : "s"}`;
}
