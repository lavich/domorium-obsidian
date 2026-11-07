import type {
  Anomaly,
  ClusterGraph,
  ClusterInfo,
  ClusterLink,
  GraphInput,
  Role,
  RootAnalysis,
} from "./types";

const MAX_LAYER = 9;
const PATHS_CAP = 1_000_000;

interface Reach {
  to: string;
  via: string;
  role: Role;
}

/** Union-find over people joined by a family, so every part of the file is walked from a root of its own. */
function componentsOf(input: GraphInput, graph: ClusterGraph): Map<string, number> {
  const parent = new Map<string, string>(input.cards.map((card) => [card.id, card.id]));
  const find = (id: string): string => {
    let at = id;
    while (parent.get(at) !== at) {
      const up = parent.get(at) ?? at;
      parent.set(at, parent.get(up) ?? up);
      at = parent.get(at) ?? at;
    }
    return at;
  };
  for (const cluster of graph.clusters) {
    const members = [...cluster.partners, ...cluster.children.map((child) => child.id)];
    const [first, ...rest] = members;
    if (first === undefined) {
      continue;
    }
    for (const other of rest) {
      const [a, b] = [find(first), find(other)];
      if (a !== b) {
        parent.set(b, a);
      }
    }
  }
  const number = new Map<string, number>();
  const result = new Map<string, number>();
  for (const card of input.cards) {
    const top = find(card.id);
    if (!number.has(top)) {
      number.set(top, number.size);
    }
    result.set(card.id, number.get(top) ?? 0);
  }
  return result;
}

function pathsUp(root: string, graph: ClusterGraph): Map<string, number> {
  const reachable = new Set([root]);
  const queue = [root];
  const above = new Map<string, string[]>();
  for (let at = 0; at < queue.length; at += 1) {
    const person = queue[at] ?? root;
    const parents: string[] = [];
    for (const id of graph.childOf.get(person) ?? []) {
      for (const parent of graph.cluster.get(id)?.partners ?? []) {
        if (!parents.includes(parent)) {
          parents.push(parent);
        }
      }
    }
    above.set(person, parents);
    for (const parent of parents) {
      if (!reachable.has(parent)) {
        reachable.add(parent);
        queue.push(parent);
      }
    }
  }
  const waiting = new Map<string, number>([...reachable].map((id) => [id, 0]));
  for (const parents of above.values()) {
    for (const parent of parents) {
      waiting.set(parent, (waiting.get(parent) ?? 0) + 1);
    }
  }
  const paths = new Map<string, number>([[root, 1]]);
  const ready = [...reachable].filter((id) => (waiting.get(id) ?? 0) === 0);
  for (let at = 0; at < ready.length; at += 1) {
    const person = ready[at] ?? root;
    const count = paths.get(person) ?? 0;
    for (const parent of above.get(person) ?? []) {
      paths.set(parent, Math.min(PATHS_CAP, (paths.get(parent) ?? 0) + count));
      waiting.set(parent, (waiting.get(parent) ?? 0) - 1);
      if (waiting.get(parent) === 0) {
        ready.push(parent);
      }
    }
  }
  return paths;
}

/**
 * The structure of the file as seen from a root: how far each cluster is,
 * whether it is an ancestor, a descendant or a collateral of the root, and the
 * layer it belongs to. The walk is explicit about direction and visits each
 * cluster once, so a file with a person who is their own ancestor ends.
 */
export function analyseRoot(input: GraphInput, graph: ClusterGraph, root: string | null): RootAnalysis {
  const component = componentsOf(input, graph);
  const rowOf = new Map(input.cards.map((card) => [card.id, card.row]));
  const born = new Map(input.cards.map((card) => [card.id, card.born]));
  const first = new Map<number, string>();
  for (const card of input.cards) {
    const at = component.get(card.id) ?? 0;
    if (!first.has(at)) {
      first.set(at, card.id);
    }
  }
  const mainRoot = root !== null && component.has(root) ? root : (input.cards[0]?.id ?? null);
  const mainComponent = mainRoot === null ? -1 : (component.get(mainRoot) ?? -1);
  const roots = new Map<number, string>(first);
  if (mainRoot !== null) {
    roots.set(mainComponent, mainRoot);
  }
  const rank = (at: number): number => (at === mainComponent ? -1 : at);

  const info = new Map<string, ClusterInfo>();
  const entering = new Map<string, Set<string>>();
  const links: ClusterLink[] = [];
  const seenLinks = new Set<string>();
  const collapsed = new Map<string, number>();

  const reaches = (from: string, at: ClusterInfo): Reach[] => {
    const cluster = graph.cluster.get(from);
    if (!cluster) {
      return [];
    }
    const found: Reach[] = [];
    const lineage = at.role === "root" || at.role === "descendant";
    const own = entering.get(from) ?? new Set<string>();
    for (const person of cluster.partners) {
      for (const up of graph.childOf.get(person) ?? []) {
        const ancestor = at.role === "ancestor" || (at.role === "root" && own.has(person));
        found.push({ to: up, via: person, role: ancestor ? "ancestor" : "collateral" });
      }
      for (const other of graph.partnerIn.get(person) ?? []) {
        if (other !== from) {
          found.push({ to: other, via: person, role: lineage && own.has(person) ? at.role : "collateral" });
        }
      }
    }
    for (const child of cluster.children) {
      for (const down of graph.partnerIn.get(child.id) ?? []) {
        found.push({ to: down, via: child.id, role: lineage ? "descendant" : "collateral" });
      }
    }
    return found;
  };

  const walk = (start: string, at: number): void => {
    const queue: string[] = [];
    const enter = (id: string, made: ClusterInfo, person: string): void => {
      info.set(id, made);
      entering.set(id, new Set([person]));
      queue.push(id);
    };
    for (const id of graph.partnerIn.get(start) ?? []) {
      if (!info.has(id)) {
        enter(id, { distance: 0, role: "root", layer: 0, component: at }, start);
      }
    }
    for (const id of queue.length > 0 ? [] : (graph.childOf.get(start) ?? [])) {
      if (!info.has(id)) {
        enter(id, { distance: 1, role: "ancestor", layer: 0, component: at }, start);
      }
    }
    for (let index = 0; index < queue.length; index += 1) {
      const from = queue[index] ?? "";
      const here = info.get(from);
      if (!here) {
        continue;
      }
      for (const reach of reaches(from, here)) {
        const known = info.get(reach.to);
        if (!known) {
          const collateral = reach.role === "collateral";
          const made: ClusterInfo = {
            distance: here.distance + 1,
            role: reach.role,
            layer: collateral ? Math.min(MAX_LAYER, here.layer + 1) : 0,
            component: at,
            parent: from,
            ...(collateral ? { branchPerson: reach.via, branchFrom: from } : {}),
          };
          enter(reach.to, made, reach.via);
          if (collateral) {
            links.push({ kind: "branch", person: reach.via, from, to: reach.to });
          }
          continue;
        }
        const key = [reach.to, from].sort().join("|") + `|${reach.via}`;
        if (known.component === at && known.parent !== from && here.parent !== reach.to && !seenLinks.has(key)) {
          seenLinks.add(key);
          links.push({ kind: "convergence", person: reach.via, from, to: reach.to });
        }
      }
    }
    for (const [id, count] of pathsUp(start, graph)) {
      if (count >= 2) {
        collapsed.set(id, Math.max(collapsed.get(id) ?? 0, count));
      }
    }
  };

  const order = [...roots.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
  for (const [at, start] of order) {
    walk(start, at);
  }
  for (const card of input.cards) {
    const at = component.get(card.id) ?? 0;
    for (const id of [...(graph.partnerIn.get(card.id) ?? []), ...(graph.childOf.get(card.id) ?? [])]) {
      if (!info.has(id)) {
        walk(card.id, at);
      }
    }
  }

  /** Twice the distance of the families a person is a partner in, or one more than that of the families they are only a child of. */
  const distanceOf = (person: string): number => {
    const reached = (ids: readonly string[] | undefined): number =>
      Math.min(Infinity, ...(ids ?? []).map((id) => info.get(id)?.distance ?? Infinity));
    const own = reached(graph.partnerIn.get(person));
    if (own !== Infinity) {
      return 2 * own;
    }
    const above = reached(graph.childOf.get(person));
    return above === Infinity ? 0 : 2 * above + 1;
  };
  const sorted = input.cards
    .map((card, at) => ({ id: card.id, at }))
    .sort((a, b) => {
      const byComponent = rank(component.get(a.id) ?? 0) - rank(component.get(b.id) ?? 0);
      if (byComponent !== 0) {
        return byComponent;
      }
      const byDistance = distanceOf(a.id) - distanceOf(b.id);
      if (byDistance !== 0) {
        return byDistance;
      }
      const [yearA, yearB] = [born.get(a.id) ?? Infinity, born.get(b.id) ?? Infinity];
      return yearA === yearB ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : yearA - yearB;
    })
    .map((one) => one.id);

  const layerOf = new Map<string, number>();
  for (const card of input.cards) {
    const layerIn = (ids: readonly string[] | undefined): number =>
      Math.min(Infinity, ...(ids ?? []).map((id) => info.get(id)?.layer ?? Infinity));
    const own = layerIn(graph.partnerIn.get(card.id));
    const layer = own === Infinity ? layerIn(graph.childOf.get(card.id)) : own;
    layerOf.set(card.id, layer === Infinity ? 0 : layer);
  }

  const anomalies: Anomaly[] = [];
  for (const cluster of graph.clusters) {
    for (const child of cluster.children) {
      const low = rowOf.get(child.id) ?? 0;
      const parents = cluster.partners.filter((partner) => (rowOf.get(partner) ?? 0) >= low);
      if (parents.length > 0 && !cluster.partners.includes(child.id)) {
        anomalies.push({ kind: "ambiguous-generation", family: cluster.id, person: child.id, people: parents });
      }
    }
  }

  return {
    root: mainRoot,
    info,
    order: sorted,
    rank: new Map(sorted.map((id, at) => [id, at])),
    links,
    collapsed,
    layerOf,
    anomalies,
  };
}
