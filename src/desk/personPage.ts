import type { GenealogyIndex, Person, PersonEvent, PersonRow, RecordLine } from "../genealogy";
import { factsByLine, renderTree, type TreeHost } from "./detail/tree";
import { ephemeralTreeState, type TreeState } from "./detail/treeSession";

export interface Fact {
  key: string;
  event: PersonEvent;
  spouse?: PersonRow;
}

export interface PageHost extends TreeHost {
  openFile(path: string): void;
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
    host,
    facts: factsByLine(facts),
    state: options.tree ?? ephemeralTreeState(),
    ...(options.header === undefined ? {} : { header: options.header }),
  });
}
