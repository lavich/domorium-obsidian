import type { GenealogyIndex } from "../genealogy";
import { drawTree, type PageHost, type PersonPageOptions } from "./personPage";

export function renderRecordPage(
  container: HTMLElement,
  record: string,
  index: GenealogyIndex,
  host: PageHost,
  options: PersonPageOptions = {},
): void {
  drawTree(container, index.record(record), index, host, options, []);
}
