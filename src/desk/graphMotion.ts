import { prefersReducedMotion } from "./dom";
import type { Item } from "./sceneItems";
import type { FileGraphLayout } from "./fileGraph";

/** The time and easing of the glide of the view, so the cards and the camera move as one. */
export const MOVE = { ms: 400, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" } as const;
const FADE_OUT_MS = 150;
const FADE_IN = { ms: 250, delay: 150 } as const;
const LINES_FADE_MS = 200;
/** Past this many cards drawn, before or after a change of scope, it is shown at once. */
export const MOVING_CARDS = 400;

export interface Motion {
  /** Where each card drawn before the change stood. */
  from: ReadonlyMap<string, { x: number; y: number }>;
  /** The elements of cards that leave, kept where they stood until they have faded. */
  ghosts: SVGElement[];
}

export function canAnimate(doc: Document): boolean {
  const view = doc.defaultView;
  return !prefersReducedMotion(doc) && typeof view?.Element?.prototype?.animate === "function";
}

const at = ({ x, y }: { x: number; y: number }): string => `translate(${x}px, ${y}px)`;

/**
 * Called before a new scope replaces what is drawn: notes where the cards drawn
 * now stand and keeps the elements of those that will not be in the new layout.
 * Returns null where nothing is to move: reduced motion, no animation in the
 * browser, nothing drawn, or too many cards drawn.
 */
export function beginMotion(
  doc: Document,
  was: FileGraphLayout | null,
  drawn: ReadonlyMap<Item, SVGElement>,
  next: FileGraphLayout,
): Motion | null {
  if (!was || !canAnimate(doc)) {
    return null;
  }
  const from = new Map<string, { x: number; y: number }>();
  const ghosts: SVGElement[] = [];
  for (const [item, element] of drawn) {
    const card = item.kind === "card" ? was.card.get(item.id) : undefined;
    if (!card) {
      continue;
    }
    from.set(item.id, { x: card.x, y: card.y });
    if (!next.card.has(item.id)) {
      ghosts.push(element);
    }
  }
  return from.size === 0 || from.size > MOVING_CARDS ? null : { from, ghosts };
}

/** `inert` does nothing on an SVG group, so its focusable parts are taken out of the tab order and the focus is let go. */
function ghost(element: SVGElement): void {
  element.classList.add("is-leaving");
  element.setAttribute("aria-hidden", "true");
  element.setAttribute("inert", "");
  for (const part of element.querySelectorAll("[tabindex]")) {
    part.setAttribute("tabindex", "-1");
  }
  const held = element.ownerDocument.activeElement;
  if (held instanceof SVGElement && element.contains(held)) {
    held.blur();
  }
  element.parentNode?.prepend(element);
  const fade = element.animate({ opacity: [1, 0] }, { duration: FADE_OUT_MS, fill: "forwards" });
  fade.onfinish = () => element.remove();
}

/**
 * Called once the new scope is drawn: cards in both layouts glide, cards new to the
 * picture fade in, the lines and nodes wait for the cards and fade in after them.
 * Where the new picture is too large nothing moves and the leaving cards go at once.
 */
export function runMotion(motion: Motion, drawn: ReadonlyMap<Item, SVGElement>, next: FileGraphLayout): void {
  let cards = 0;
  for (const item of drawn.keys()) {
    cards += item.kind === "card" ? 1 : 0;
  }
  if (cards > MOVING_CARDS) {
    for (const element of motion.ghosts) {
      element.remove();
    }
    return;
  }
  for (const element of motion.ghosts) {
    ghost(element);
  }
  let changed = motion.ghosts.length > 0;
  for (const item of drawn.keys()) {
    if (item.kind === "card") {
      const to = next.card.get(item.id);
      const from = motion.from.get(item.id);
      changed = changed || !from || (to !== undefined && (from.x !== to.x || from.y !== to.y));
    }
  }
  for (const [item, element] of drawn) {
    if (item.kind === "card") {
      const to = next.card.get(item.id);
      const from = motion.from.get(item.id);
      if (!to) {
        continue;
      }
      if (!from) {
        element.animate({ opacity: [0, 1] }, { duration: FADE_IN.ms, delay: FADE_IN.delay, fill: "backwards" });
      } else if (from.x !== to.x || from.y !== to.y) {
        element.animate({ transform: [at(from), at(to)] }, { duration: MOVE.ms, easing: MOVE.easing });
      }
    } else if (changed) {
      element.animate({ opacity: [0, 1] }, { duration: LINES_FADE_MS, delay: MOVE.ms, fill: "backwards" });
    }
  }
}
