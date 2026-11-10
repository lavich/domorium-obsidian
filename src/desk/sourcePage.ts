import type { GenealogyIndex, Source } from "../genealogy";
import { drawTree, type PageHost, type PersonPageOptions } from "./personPage";

export function renderSourcePage(
  container: HTMLElement,
  source: Source,
  index: GenealogyIndex,
  host: PageHost,
  options: PersonPageOptions = {},
): void {
  drawTree(container, source.xref === undefined ? undefined : index.record(source.xref), index, host, options, []);
}
