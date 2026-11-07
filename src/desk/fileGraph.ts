import type { BranchScope } from "./branchScope";
import { runLayout } from "./familyLayout/engine";
import type { FileTimeline } from "./fileTimeline";
import type { FileGraphLayout, GraphInput } from "./familyLayout/types";

export { CARD, LANE, ROW_GAP, SWEEPS } from "./familyLayout/types";
export { countCrossings } from "./familyLayout/crossings";
export type {
  FileGraphLayout,
  GraphBand,
  GraphCard,
  GraphInput,
  GraphInputCard,
  GraphInputFamily,
  GraphLine,
  GraphNode,
  NodeKind,
  Point,
} from "./familyLayout/types";

/** Two digits after an apostrophe; nothing for a year before the era, which two digits cannot say. */
export function marriageDigits(year: number): string {
  return year > 0 ? `’${String(year % 100).padStart(2, "0")}` : "";
}

/** The cards and families of a model as a graph input, restricted to the branch of the scope's focus. */
export function graphInputOf(model: FileTimeline, scope: BranchScope): GraphInput {
  const focus = scope.focus !== undefined && model.people.has(scope.focus) ? scope.focus : null;
  const keep = focus === null ? null : model.branch(focus);
  const shown = keep ? model.rows.filter((xref) => keep.has(xref)) : model.rows;
  return {
    cards: shown.map((xref) => ({
      id: xref,
      row: model.generations.get(xref) ?? 0,
      sex: model.people.get(xref)?.sex ?? "U",
      ...bornOf(model, xref),
    })),
    families: [...model.families.values()].map((family) => ({
      id: family.xref,
      spouses: family.spouses,
      children: family.children,
      year: family.marriage?.year ?? null,
      links: family.links,
    })),
    focus,
  };
}

export function layoutFileGraph(
  model: FileTimeline,
  scope: BranchScope,
  clock: () => number = () => performance.now(),
): FileGraphLayout {
  return layoutGraph(graphInputOf(model, scope), clock);
}

function bornOf(model: FileTimeline, xref: string): { born?: number } {
  const born = model.people.get(xref)?.lifeline?.age?.from;
  return born === undefined ? {} : { born };
}

export function layoutGraph(input: GraphInput, clock: () => number = () => performance.now()): FileGraphLayout {
  return runLayout(input, {}, clock);
}

const LAYOUTS_HELD = 4;
const held = new WeakMap<FileTimeline, { key: string; layout: FileGraphLayout }[]>();

/** The last few layouts of a model, so going back and forth between a branch and the whole file costs nothing. */
export function fileGraphOf(model: FileTimeline, scope: BranchScope): FileGraphLayout {
  const key =
    scope.focus !== undefined && model.people.has(scope.focus) ? scope.focus : "";
  const list = held.get(model) ?? [];
  const found = list.find((one) => one.key === key);
  const layout = found?.layout ?? layoutFileGraph(model, scope);
  held.set(model, [{ key, layout }, ...list.filter((one) => one !== found)].slice(0, LAYOUTS_HELD));
  return layout;
}
