// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

import { layoutGraph, type FileGraphLayout, type GraphInput } from "./fileGraph";
import { beginMotion, canAnimate, MOVE, MOVING_CARDS, runMotion } from "./graphMotion";
import type { Item } from "./sceneItems";

interface Played {
  element: Element;
  keyframes: Record<string, unknown>;
  options: KeyframeAnimationOptions;
  finish: { onfinish: (() => void) | null };
}

let played: Played[] = [];

function stubAnimate(): void {
  played = [];
  vi.spyOn(window.Element.prototype, "animate").mockImplementation(function (
    this: Element,
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
    options?: number | KeyframeAnimationOptions,
  ) {
    const finish = { onfinish: null as (() => void) | null };
    played.push({
      element: this,
      keyframes: keyframes as Record<string, unknown>,
      options: options as KeyframeAnimationOptions,
      finish,
    });
    return finish as unknown as Animation;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const people = (ids: string[]): GraphInput["cards"] => ids.map((id) => ({ id, row: id.startsWith("c") ? 1 : 0, sex: "U" as const }));

const before = (): FileGraphLayout =>
  layoutGraph({
    cards: people(["a", "b", "c1", "c2"]),
    families: [{ id: "f", spouses: ["a", "b"], children: ["c1", "c2"], year: null }],
    focus: null,
  });

const after = (): FileGraphLayout =>
  layoutGraph({
    cards: people(["a", "c2", "d", "c3"]),
    families: [{ id: "g", spouses: ["a"], children: ["c2", "c3"], year: null }],
    focus: null,
  });

function element(): SVGElement {
  const found = document.createElementNS("http://www.w3.org/2000/svg", "g");
  document.body.append(found);
  return found;
}

function item(kind: Item["kind"], id: string): Item {
  return { kind, id, left: 0, top: 0, right: 1, bottom: 1, make: element };
}

function drawn(layout: FileGraphLayout, kinds: Item["kind"][] = []): Map<Item, SVGElement> {
  const found = new Map<Item, SVGElement>();
  for (const card of layout.cards) {
    found.set(item("card", card.id), element());
  }
  kinds.forEach((kind, at) => found.set(item(kind, `${kind}${at}`), element()));
  return found;
}

describe("whether anything moves", () => {
  it("is so where the browser animates and the reader has not asked for less", () => {
    stubAnimate();
    expect(canAnimate(document)).toBe(true);
  });

  it("is not so where the reader asks for reduced motion", () => {
    stubAnimate();
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query }));
    expect(canAnimate(document)).toBe(false);
    expect(beginMotion(document, before(), drawn(before()), after())).toBeNull();
  });

  it("is not so where the browser has no animation", () => {
    const own = Object.getOwnPropertyDescriptor(window.Element.prototype, "animate");
    Object.defineProperty(window.Element.prototype, "animate", { value: undefined, configurable: true });
    try {
      expect(canAnimate(document)).toBe(false);
    } finally {
      if (own) {
        Object.defineProperty(window.Element.prototype, "animate", own);
      }
    }
  });

  it("is not so with nothing drawn before, no layout before, or more than the limit drawn", () => {
    stubAnimate();
    expect(beginMotion(document, null, drawn(before()), after())).toBeNull();
    expect(beginMotion(document, before(), new Map(), after())).toBeNull();
    const many = layoutGraph({
      cards: Array.from({ length: MOVING_CARDS + 1 }, (_, at) => ({ id: `p${at}`, row: 0, sex: "U" as const })),
      families: [],
      focus: null,
    });
    expect(beginMotion(document, many, drawn(many), after())).toBeNull();
  });
});

describe("a change of scope", () => {
  const run = () => {
    stubAnimate();
    const [then, now] = [before(), after()];
    const elements = drawn(then, ["node", "line"]);
    const motion = beginMotion(document, then, elements, now);
    const next = drawn(now, ["node", "line"]);
    if (!motion) {
      throw new Error("no motion");
    }
    runMotion(motion, next, now);
    return { then, now, motion, next };
  };
  const by = (id: string, next: Map<Item, SVGElement>) => [...next].find(([one]) => one.id === id)?.[1];

  it("glides a card that stands in both layouts from where it stood to where it stands, with the glide of the view", () => {
    const { then, now, next } = run();
    const kept = played.find((one) => one.element === by("c2", next));
    const [from, to] = [then.card.get("c2"), now.card.get("c2")];

    expect(kept?.keyframes.transform).toEqual([`translate(${from?.x}px, ${from?.y}px)`, `translate(${to?.x}px, ${to?.y}px)`]);
    expect(kept?.options.duration).toBe(MOVE.ms);
    expect(kept?.options.easing).toBe(MOVE.easing);
  });

  it("does not animate a card that stands where it stood", () => {
    stubAnimate();
    const same = before();
    const motion = beginMotion(document, same, drawn(same), same);
    const next = drawn(same);
    runMotion(motion as NonNullable<typeof motion>, next, same);

    expect(played).toHaveLength(0);
  });

  it("fades in a card new to the picture, after a moment", () => {
    const { next } = run();
    const fresh = played.find((one) => one.element === by("d", next));

    expect(fresh?.keyframes.opacity).toEqual([0, 1]);
    expect(fresh?.options.delay).toBeGreaterThan(0);
    expect(fresh?.options.fill).toBe("backwards");
  });

  it("keeps the lines and nodes out of sight until the cards have arrived, then fades them in", () => {
    const { next } = run();
    const waits = played.filter((one) => [...next].some(([item, el]) => item.kind !== "card" && el === one.element));

    expect(waits).toHaveLength(2);
    for (const wait of waits) {
      expect(wait.keyframes.opacity).toEqual([0, 1]);
      expect(wait.options.delay).toBe(MOVE.ms);
      expect(wait.options.fill).toBe("backwards");
    }
  });

  it("keeps a leaving card where it stood, out of reach, and removes it when it has faded", () => {
    stubAnimate();
    const [then, now] = [before(), after()];
    const elements = drawn(then);
    const leaving = [...elements].find(([one]) => one.id === "b")?.[1];
    const motion = beginMotion(document, then, elements, now);
    runMotion(motion as NonNullable<typeof motion>, drawn(now), now);

    expect(motion?.ghosts).toContain(leaving);
    expect(leaving?.hasAttribute("inert")).toBe(true);
    expect(leaving?.getAttribute("aria-hidden")).toBe("true");
    expect(leaving?.classList.contains("is-leaving")).toBe(true);
    expect(document.body.contains(leaving ?? null)).toBe(true);
    played.find((one) => one.element === leaving)?.finish.onfinish?.();
    expect(document.body.contains(leaving ?? null)).toBe(false);
  });

  it("moves nothing and drops the leaving cards at once where the new picture is too large", () => {
    stubAnimate();
    const [then, now] = [before(), after()];
    const elements = drawn(then);
    const leaving = [...elements].find(([one]) => one.id === "b")?.[1];
    const motion = beginMotion(document, then, elements, now);
    const crowd = new Map<Item, SVGElement>();
    for (let at = 0; at <= MOVING_CARDS; at += 1) {
      crowd.set(item("card", `x${at}`), element());
    }
    runMotion(motion as NonNullable<typeof motion>, crowd, now);

    expect(played).toHaveLength(0);
    expect(document.body.contains(leaving ?? null)).toBe(false);
  });
});
