import type { PointerCandidate, Position, Range, StructureFieldDescription } from "@domorium/language-service";

import type { GenealogyIndex, Person, PersonEvent, PersonRow, RecordLine } from "../genealogy";
import { factsByLine, renderTree, type FieldChoice, type PointerChoice } from "./detail/tree";
import { ephemeralTreeState, type TreeState } from "./detail/treeSession";

export interface Fact {
  key: string;
  event: PersonEvent;
  spouse?: PersonRow;
}

export interface PageHost {
  openRecord(xref: string): void;
  showInSource(range: Range): void;
  openFile(path: string): void;
  setIcon?(element: HTMLElement, icon: string): void;
  addableAt?(at: Position): StructureFieldDescription[];
  choicesAt?(at: Position): string[];
  pointerChoicesAt?(parent: Position, tag: string): PointerCandidate[];
  chooseField?(event: MouseEvent, fields: FieldChoice[]): void;
  choosePointer?(choices: PointerChoice[]): void;
}

export interface PersonPageOptions {
  tree?: TreeState;
  header?: HTMLElement;
}

export function factsOf(person: Person): Fact[] {
  return person.events.map((event, at) => ({ key: `p:${at}`, event }));
}

export function renderPersonPage(
  container: HTMLElement,
  person: Person,
  index: GenealogyIndex,
  options: PersonPageOptions,
  host: PageHost,
): void {
  const lines = person.xref === undefined ? undefined : index.record(person.xref);
  drawTree(container, lines, index, host, options, factsOf(person));
}

export function drawTree(
  container: HTMLElement,
  lines: RecordLine | undefined,
  index: GenealogyIndex,
  host: PageHost,
  options: PersonPageOptions,
  facts: Fact[],
): void {
  if (lines === undefined) {
    return;
  }
  renderTree(container, lines, {
    index,
    host: {
      openRecord: (xref) => host.openRecord(xref),
      showInSource: (range) => host.showInSource(range),
      ...(host.choosePointer === undefined ? {} : { choosePointer: (choices: PointerChoice[]) => host.choosePointer?.(choices) }),
      ...(host.pointerChoicesAt === undefined
        ? {}
        : { pointerChoicesAt: (parent: Position, tag: string) => host.pointerChoicesAt?.(parent, tag) ?? [] }),
      ...(host.choicesAt === undefined ? {} : { choicesAt: (at: Position) => host.choicesAt?.(at) ?? [] }),
      ...(host.addableAt === undefined ? {} : { addableAt: (at: Position) => host.addableAt?.(at) ?? [] }),
      ...(host.chooseField === undefined ? {} : { chooseField: (event: MouseEvent, fields: FieldChoice[]) => host.chooseField?.(event, fields) }),
      ...(host.setIcon === undefined ? {} : { setIcon: (element, icon) => host.setIcon?.(element, icon) }),
    },
    facts: factsByLine(facts),
    state: options.tree ?? ephemeralTreeState(),
    ...(options.header === undefined ? {} : { header: options.header }),
  });
}
