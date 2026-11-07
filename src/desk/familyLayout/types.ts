import type { ChildLinkKind } from "../../genealogy";
import type { Sex } from "../fileTimeline";

export const CARD = { width: 124, height: 58 } as const;
/** Between one row's bottom edge and the next row's top. */
export const ROW_GAP = 84;
export const LANE = 10;

/** `budget` bounds the ordering, and `pulls` the ordering and the pulling together, in milliseconds. */
export const SWEEPS = { most: 24, idle: 4, budget: 250, pulls: 500 } as const;

export type Point = [number, number];

export type Direction = "TB" | "BT" | "LR" | "RL";

export type LinkKind = ChildLinkKind;

/** A card to lay out: a person in the graph of a file, a box of its own in a person's tree. */
export interface GraphInputCard {
  id: string;
  /** Any number, a generation or a step from a focus: rows are ordered by it, and a number no card has makes no row. */
  row: number;
  sex: Sex;
  born?: number;
  portrait?: boolean;
}

export interface GraphInputFamily {
  id: string;
  /** Card ids; the first is the husband where the family names one. */
  spouses: string[];
  children: string[];
  year: number | null;
  /** The kind of each child's link to the family, where the file states one. */
  links?: Readonly<Record<string, LinkKind>>;
}

export interface GraphInput {
  /** In the order each row starts from. */
  cards: GraphInputCard[];
  /** In the order a person's marriages come, which decides who stands left where sex and role cannot. */
  families: GraphInputFamily[];
  focus: string | null;
}

export interface GraphCard {
  id: string;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A row's start and end along the axis of generations; cards stand on the end. */
export interface GraphBand {
  top: number;
  bottom: number;
}

/**
 * `pair`: between neighbouring spouses. `below`: under a block whose two
 * spouses are not neighbours, as a third marriage leaves them. `across`: on
 * the line between spouses in different rows.
 */
export type NodeKind = "pair" | "below" | "across";

export interface GraphNode {
  family: string;
  kind: NodeKind;
  x: number;
  y: number;
  year: number | null;
  /** The left spouse first, or the upper one where they stand in different rows. */
  spouses: [string, string];
  /** The partners of a family of more than two, beyond the pair; each has a join of its own. */
  others: string[];
  /** What joins the node to its spouses' cards, each a line of square corners. */
  joins: Point[][];
}

export interface GraphLine {
  id: string;
  family: string;
  child: string;
  parents: string[];
  relationship: LinkKind;
  /** The rows between the family and the child, and where in each the line passes, across the generations: x for a layout running down or up, y for one running sideways. */
  lanes: { row: number; x: number }[];
  /**
   * From the family's node, or its one parent's card, to the child's card:
   * straight down out of the parents' row, through each lane, and into the
   * child's row, so that it turns only between rows and never across a card.
   */
  points: Point[];
}

export interface Weights {
  distance: number;
  crossings: number;
  overlap: number;
  generation: number;
  cluster: number;
  displacement: number;
}

export interface LayoutOptions {
  direction: Direction;
  /** Between neighbouring spouses. */
  nodeSpacing: number;
  /** Between families standing side by side. */
  familySpacing: number;
  /** Between one row's bottom edge and the next row's top. */
  generationSpacing: number;
  /** Bounds the work of the optimisation, in sweeps and in pulls together. */
  optimizationIterations: number;
  weights: Weights;
  /** The most a card may stand off its generation's line, in pitches; none unless asked for. */
  generationSlack: number;
  /** Positions of an earlier layout, in the coordinates of that layout, pulling the new one. */
  previous?: ReadonlyMap<string, { x: number; y: number }>;
  /** Cards that stay where `previous` (or the initial placement) puts them, the spouses they stand beside with them. */
  pinned?: ReadonlySet<string>;
}

export const DEFAULT_WEIGHTS: Weights = {
  distance: 1,
  crossings: 1_000,
  overlap: 1_000_000,
  generation: 100,
  cluster: 2,
  displacement: 0.05,
};

export const DEFAULT_OPTIONS: LayoutOptions = {
  direction: "TB",
  nodeSpacing: 36,
  familySpacing: 48,
  generationSpacing: ROW_GAP,
  optimizationIterations: SWEEPS.most + 40,
  weights: DEFAULT_WEIGHTS,
  generationSlack: 0,
};

export type ClusterLinkKind = "descent" | "remarriage" | "alternate-parents" | "convergence" | "branch" | "reference";

export type Role = "root" | "ancestor" | "descendant" | "collateral";

export interface ClusterChild {
  id: string;
  kind: LinkKind;
}

/** One family record as the graph shows it. A person is in as many as the file links them to. */
export interface FamilyCluster {
  id: string;
  partners: string[];
  children: ClusterChild[];
  year: number | null;
}

export interface ClusterLink {
  kind: ClusterLinkKind;
  /** The person the two clusters share, or the one the connection reaches. */
  person: string;
  from: string;
  to: string;
  /** The kind of the link at each end where the file states one. */
  fromKind?: LinkKind;
  toKind?: LinkKind;
}

export type AnomalyKind = "self-parent" | "duplicate-member" | "cycle" | "ambiguous-generation";

/** Something in the file the layout could not honour as written, kept and reported, never dropped. */
export interface Anomaly {
  kind: AnomalyKind;
  family?: string;
  person?: string;
  people?: string[];
}

export interface ClusterGraph {
  clusters: FamilyCluster[];
  cluster: ReadonlyMap<string, FamilyCluster>;
  /** Clusters a person is a child of, and a partner in, in the order the families come. */
  childOf: ReadonlyMap<string, string[]>;
  partnerIn: ReadonlyMap<string, string[]>;
  links: ClusterLink[];
  anomalies: Anomaly[];
  cyclic: ReadonlySet<string>;
}

export interface ClusterInfo {
  distance: number;
  role: Role;
  layer: number;
  component: number;
  /** The cluster the walk came from; absent for the clusters it starts at. */
  parent?: string;
  /** For a collateral cluster, where it hangs from. */
  branchPerson?: string;
  branchFrom?: string;
}

export interface RootAnalysis {
  root: string | null;
  info: ReadonlyMap<string, ClusterInfo>;
  /** Every shown person, in a stable order that follows the structure from the root. */
  order: string[];
  rank: ReadonlyMap<string, number>;
  /** Links found while walking: branch points and convergence points. */
  links: ClusterLink[];
  /** The ancestors reached by more than one path from the root, with the number of paths (saturating). */
  collapsed: ReadonlyMap<string, number>;
  layerOf: ReadonlyMap<string, number>;
  anomalies: Anomaly[];
}

export interface EnergyTerms {
  distance: number;
  crossings: number;
  overlap: number;
  generation: number;
  cluster: number;
  displacement: number;
  total: number;
}

export interface FileGraphLayout {
  /** In row order, left to right. */
  cards: GraphCard[];
  card: ReadonlyMap<string, GraphCard>;
  nodes: GraphNode[];
  node: ReadonlyMap<string, GraphNode>;
  lines: GraphLine[];
  focus: string | null;
  width: number;
  height: number;
  rows: number;
  bands: GraphBand[];
  crossings: number;
  crossingsAtStart: number;
  iterations: number;
  direction: Direction;
  clusters: FamilyCluster[];
  links: ClusterLink[];
  layerOf: ReadonlyMap<string, number>;
  anomalies: Anomaly[];
  energy: { start: EnergyTerms; end: EnergyTerms };
}

/** The sizes the stages measure with, in the coordinates of the layout before it is turned to its direction. */
export interface Geometry {
  /** A card's extent across the generations, and along them. */
  across: number;
  along: number;
  spouse: number;
  block: number;
  sibling: number;
  lane: number;
  laneGap: number;
  rowGap: number;
  pitch: number;
  most: number;
  below: number;
  clear: number;
  bend: number;
  bendStep: number;
  long: number;
}

export function geometryOf(options: LayoutOptions): Geometry {
  const turned = options.direction === "LR" || options.direction === "RL";
  const across = turned ? CARD.height : CARD.width;
  const along = turned ? CARD.width : CARD.height;
  return {
    across,
    along,
    spouse: options.nodeSpacing,
    block: options.familySpacing,
    sibling: 12,
    lane: LANE,
    laneGap: 20,
    rowGap: options.generationSpacing,
    pitch: across + options.nodeSpacing,
    most: 2 * across,
    below: 16,
    clear: 10,
    bend: 8,
    bendStep: 4,
    long: along + options.generationSpacing,
  };
}
