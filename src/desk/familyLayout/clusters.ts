import type {
  Anomaly,
  ClusterGraph,
  ClusterLink,
  FamilyCluster,
  GraphInput,
  LinkKind,
} from "./types";

function pushTo(map: Map<string, string[]>, key: string, value: string): void {
  const list = map.get(key);
  if (list) {
    list.push(value);
  } else {
    map.set(key, [value]);
  }
}

/** Strongly connected components of a graph, walked without recursion. */
function components(nodes: readonly string[], next: ReadonlyMap<string, string[]>): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const found: string[][] = [];
  let counter = 0;
  for (const start of nodes) {
    if (index.has(start)) {
      continue;
    }
    const work: { node: string; at: number }[] = [{ node: start, at: 0 }];
    index.set(start, counter);
    low.set(start, counter);
    counter += 1;
    stack.push(start);
    onStack.add(start);
    while (work.length > 0) {
      const frame = work[work.length - 1];
      if (!frame) {
        break;
      }
      const edges = next.get(frame.node) ?? [];
      if (frame.at < edges.length) {
        const to = edges[frame.at];
        frame.at += 1;
        if (to === undefined) {
          continue;
        }
        if (!index.has(to)) {
          index.set(to, counter);
          low.set(to, counter);
          counter += 1;
          stack.push(to);
          onStack.add(to);
          work.push({ node: to, at: 0 });
        } else if (onStack.has(to)) {
          low.set(frame.node, Math.min(low.get(frame.node) ?? 0, index.get(to) ?? 0));
        }
        continue;
      }
      work.pop();
      const parent = work[work.length - 1];
      if (parent) {
        low.set(parent.node, Math.min(low.get(parent.node) ?? 0, low.get(frame.node) ?? 0));
      }
      if (low.get(frame.node) === index.get(frame.node)) {
        const part: string[] = [];
        for (let top = stack.pop(); top !== undefined; top = stack.pop()) {
          onStack.delete(top);
          part.push(top);
          if (top === frame.node) {
            break;
          }
        }
        found.push(part);
      }
    }
  }
  return found;
}

/**
 * One cluster for each family the graph shows, and the links between clusters
 * that share a person. Nothing is added and nothing dropped: what the file
 * writes oddly is kept and reported in `anomalies`.
 */
export function buildClusters(input: GraphInput): ClusterGraph {
  const shown = new Set(input.cards.map((card) => card.id));
  const clusters: FamilyCluster[] = [];
  const anomalies: Anomaly[] = [];
  const childOf = new Map<string, string[]>();
  const partnerIn = new Map<string, string[]>();
  for (const family of input.families) {
    const partners: string[] = [];
    for (const id of family.spouses) {
      if (!shown.has(id)) {
        continue;
      }
      if (partners.includes(id)) {
        anomalies.push({ kind: "duplicate-member", family: family.id, person: id });
        continue;
      }
      partners.push(id);
    }
    const children: FamilyCluster["children"] = [];
    for (const id of family.children) {
      if (!shown.has(id)) {
        continue;
      }
      if (children.some((child) => child.id === id)) {
        anomalies.push({ kind: "duplicate-member", family: family.id, person: id });
        continue;
      }
      if (partners.includes(id)) {
        anomalies.push({ kind: "self-parent", family: family.id, person: id });
      }
      children.push({ id, kind: family.links?.[id] ?? "unstated" });
    }
    if (partners.length === 0 && children.length === 0) {
      continue;
    }
    clusters.push({ id: family.id, partners, children, year: family.year });
    for (const id of partners) {
      pushTo(partnerIn, id, family.id);
    }
    for (const child of children) {
      pushTo(childOf, child.id, family.id);
    }
  }
  const cluster = new Map(clusters.map((one) => [one.id, one]));
  const kindOf = (id: string, person: string): LinkKind | undefined =>
    cluster.get(id)?.children.find((child) => child.id === person)?.kind;

  const links: ClusterLink[] = [];
  for (const [person, above] of childOf) {
    for (const below of partnerIn.get(person) ?? []) {
      for (const from of above) {
        links.push({ kind: "descent", person, from, to: below, fromKind: kindOf(from, person) ?? "unstated" });
      }
    }
    for (let at = 1; at < above.length; at += 1) {
      const [from, to] = [above[at - 1] ?? "", above[at] ?? ""];
      links.push({
        kind: "alternate-parents",
        person,
        from,
        to,
        fromKind: kindOf(from, person) ?? "unstated",
        toKind: kindOf(to, person) ?? "unstated",
      });
    }
  }
  for (const [person, spouse] of partnerIn) {
    for (let at = 1; at < spouse.length; at += 1) {
      links.push({ kind: "remarriage", person, from: spouse[at - 1] ?? "", to: spouse[at] ?? "" });
    }
  }

  const next = new Map<string, string[]>();
  for (const one of clusters) {
    for (const parent of one.partners) {
      for (const child of one.children) {
        pushTo(next, parent, child.id);
      }
    }
  }
  const cyclic = new Set<string>();
  const inLoop = new Map<string, number>();
  components([...shown], next).forEach((part, at) => {
    const loops = part.length > 1 || (next.get(part[0] ?? "") ?? []).includes(part[0] ?? "");
    if (loops) {
      part.forEach((id) => inLoop.set(id, at));
      anomalies.push({ kind: "cycle", people: part.sort() });
    }
  });
  for (const one of clusters) {
    const loop = one.partners.map((id) => inLoop.get(id)).find((at) => at !== undefined);
    if (loop !== undefined && one.children.some((child) => inLoop.get(child.id) === loop)) {
      cyclic.add(one.id);
    }
  }

  return { clusters, cluster, childOf, partnerIn, links, anomalies, cyclic };
}
