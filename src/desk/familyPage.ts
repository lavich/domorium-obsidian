import type { Family, GenealogyIndex } from "../genealogy";
import { drawTree, type Fact, type PageHost, type PersonPageOptions } from "./personPage";

export function familyFacts(family: Family): Fact[] {
  return family.events.map((event, at) => ({ key: `f:${at}`, event }));
}

export function renderFamilyPage(
  container: HTMLElement,
  family: Family,
  index: GenealogyIndex,
  options: PersonPageOptions,
  host: PageHost,
): void {
  const lines = family.xref === undefined ? undefined : index.record(family.xref);
  drawTree(container, lines, index, host, options, familyFacts(family));
}
