import type { MoveDescription, MoveSlot } from "@domorium/language-service";

import type { Refusal } from "../edits";

export function keyOf(parent: string, tag: string, nth: number): string {
  return `${parent === "" ? "" : `${parent}.`}${tag}[${nth}]`;
}

/** The new key of every sibling whose key a move from place `from` to before place `to` changes; `to` is the count for the end. */
export function movedKeys(parentKey: string, tags: readonly string[], from: number, to: number): Map<string, string> {
  const keys = (order: readonly number[]): Map<number, string> => {
    const seen = new Map<string, number>();
    return new Map(
      order.map((at) => {
        const tag = tags[at] ?? "";
        const nth = seen.get(tag) ?? 0;
        seen.set(tag, nth + 1);
        return [at, keyOf(parentKey, tag, nth)];
      }),
    );
  };
  const order = tags.map((_, at) => at);
  const after = order.filter((at) => at !== from);
  after.splice(to > from ? to - 1 : to, 0, from);
  const was = keys(order);
  const now = keys(after);
  const renames = new Map<string, string>();
  for (const [at, key] of was) {
    const next = now.get(at);
    if (next !== undefined && next !== key) {
      renames.set(key, next);
    }
  }
  return renames;
}

/** Where a sibling stands, in the pointer's coordinates: its node's top and bottom, and the middle of its own row. */
export interface SiblingBox {
  top: number;
  middle: number;
  bottom: number;
}

/** The boundary among the siblings at `y`: `k` before sibling `k`, the count after the last one, none outside their band. */
export function slotAt(boxes: readonly SiblingBox[], y: number): number | null {
  const first = boxes[0];
  const last = boxes.at(-1);
  if (!first || !last || y < first.top || y > last.bottom) {
    return null;
  }
  const below = boxes.findIndex((box) => y < box.bottom);
  const at = below < 0 ? boxes.length - 1 : below;
  return y < (boxes[at]?.middle ?? 0) ? at : at + 1;
}

/** The slots of a description by the boundary they stand at among the sibling rows, matched by line; the end after the last row that has a slot. */
export function slotsByBoundary(lines: readonly number[], slots: readonly MoveSlot[]): Map<number, MoveSlot> {
  const placed = new Map<number, MoveSlot>();
  let last = -1;
  for (const slot of slots) {
    if ("before" in slot.target) {
      const at = lines.indexOf(slot.target.before.line);
      if (at >= 0) {
        placed.set(at, slot);
        last = Math.max(last, at);
      }
    }
  }
  const end = slots.find((slot) => "end" in slot.target);
  if (end) {
    placed.set(last + 1, end);
  }
  return placed;
}

export interface DragOptions {
  grip: HTMLElement;
  /** The moved line's node, its subtree included. */
  node: HTMLElement;
  describe(): MoveDescription | Refusal;
  refused(refusal: Refusal): void;
  drop(slot: MoveSlot): void;
}

const THRESHOLD = 5;
const EDGE = 50;
const SPEED = 10;
/** The copy hangs below the pointer, so the drop line at the pointer stays in sight. */
const BELOW = 8;

function scrollerOf(element: HTMLElement): HTMLElement | null {
  for (let at = element.parentElement; at; at = at.parentElement) {
    const overflow = at.win.getComputedStyle(at).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && at.scrollHeight > at.clientHeight) {
      return at;
    }
  }
  return null;
}

/** One drag of a grip, from the press to its end: the copy that follows the pointer, the drop line, and the scroll near an edge. */
export class TreeDrag {
  private readonly pointerId: number;
  private readonly startX: number;
  private readonly startY: number;
  private x: number;
  private y: number;
  private started = false;
  private ended = false;
  private frame = 0;
  private offsetX = 0;
  private ghost: HTMLElement | null = null;
  private indicator: HTMLElement | null = null;
  private tree: HTMLElement | null = null;
  private scroller: HTMLElement | null = null;
  private slots = new Map<number, MoveSlot>();
  private shown: MoveSlot | null = null;

  constructor(
    press: PointerEvent,
    private readonly options: DragOptions,
  ) {
    const { grip } = options;
    press.preventDefault();
    this.pointerId = press.pointerId;
    this.startX = press.clientX;
    this.startY = press.clientY;
    this.x = press.clientX;
    this.y = press.clientY;
    try {
      grip.setPointerCapture(press.pointerId);
    } catch {
      // A pointer the browser no longer tracks cannot be captured; the document still hears it.
    }
    grip.doc.addEventListener("pointermove", this.moved);
    grip.doc.addEventListener("pointerup", this.released);
    grip.doc.addEventListener("pointercancel", this.cancelled);
    grip.doc.addEventListener("lostpointercapture", this.cancelled);
    grip.win.addEventListener("keydown", this.key, true);
    this.frame = grip.win.requestAnimationFrame(this.tick);
  }

  private readonly moved = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId || this.ended) {
      return;
    }
    this.x = event.clientX;
    this.y = event.clientY;
    if (!this.started) {
      if (Math.hypot(this.x - this.startX, this.y - this.startY) < THRESHOLD || !this.start()) {
        return;
      }
    }
    event.preventDefault();
    this.follow();
  };

  private readonly released = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) {
      return;
    }
    const slot = this.started ? this.shown : null;
    this.end();
    if (slot) {
      this.options.drop(slot);
    }
  };

  private readonly cancelled = (event: PointerEvent): void => {
    if (event.pointerId === this.pointerId) {
      this.end();
    }
  };

  private readonly key = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") {
      return;
    }
    if (this.started) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.end();
  };

  private readonly tick = (): void => {
    if (this.ended) {
      return;
    }
    if (!this.options.grip.isConnected) {
      this.end();
      return;
    }
    if (this.started) {
      this.scroll();
    }
    this.frame = this.options.grip.win.requestAnimationFrame(this.tick);
  };

  private start(): boolean {
    const { grip, node } = this.options;
    const described = this.options.describe();
    if (!described.ok) {
      this.end();
      this.options.refused(described);
      return false;
    }
    this.started = true;
    this.slots = slotsByBoundary(this.siblings().map((one) => Number(one.getAttribute("data-line"))), described.slots);
    this.tree = node.closest<HTMLElement>(".gedcom-tree");
    this.scroller = this.tree ? scrollerOf(this.tree) : null;
    const row = node.querySelector<HTMLElement>(":scope > .gedcom-tree-row") ?? node;
    const box = row.getBoundingClientRect();
    this.offsetX = this.startX - box.left;

    const doc = grip.doc;
    doc.body.addClass("is-grabbing");
    const ghost = doc.body.createDiv({ cls: ["drag-reorder-ghost", "gedcom-tree"] });
    ghost.setAttribute("aria-hidden", "true");
    ghost.setAttribute("inert", "");
    const copy = node.cloneNode(false) as HTMLElement;
    copy.append(row.cloneNode(true));
    copy.addClass("mod-dragged-item");
    for (const one of [copy, ...copy.querySelectorAll<HTMLElement>("[id], [data-focus-key]")]) {
      one.removeAttribute("id");
      one.removeAttribute("data-focus-key");
    }
    ghost.append(copy);
    ghost.setCssStyles({ width: `${box.width}px`, height: `${box.height}px` });
    this.ghost = ghost;
    node.addClass("drag-ghost-hidden");
    this.indicator = this.tree?.createDiv({ cls: "drop-indicator" }) ?? null;
    return true;
  }

  private siblings(): HTMLElement[] {
    const { node } = this.options;
    return [...(node.parentElement?.querySelectorAll<HTMLElement>(":scope > .gedcom-tree-node:not(.is-unwritten)") ?? [])];
  }

  private follow(): void {
    this.ghost?.setCssStyles({ transform: `translate(${this.x - this.offsetX}px, ${this.y + BELOW}px)` });
    const siblings = this.siblings();
    const boxes = siblings.map((one) => {
      const node = one.getBoundingClientRect();
      const row = (one.querySelector(":scope > .gedcom-tree-row") ?? one).getBoundingClientRect();
      return { top: node.top, middle: row.top + row.height / 2, bottom: node.bottom };
    });
    const boundary = slotAt(boxes, this.y);
    const slot = boundary === null ? undefined : this.slots.get(boundary);
    this.shown = slot?.changesOrder ? slot : null;
    const { indicator, tree } = this;
    indicator?.toggleClass("is-active", this.shown !== null);
    if (!indicator || !tree || boundary === null || this.shown === null) {
      return;
    }
    const above = boxes[boundary - 1];
    const below = boxes[boundary];
    const y = above && below ? (above.bottom + below.top) / 2 : (below?.top ?? above?.bottom ?? 0);
    const area = tree.getBoundingClientRect();
    const first = siblings[0]?.getBoundingClientRect();
    const rtl = tree.win.getComputedStyle(tree).direction === "rtl";
    const start = first ? (rtl ? area.right - first.right : first.left - area.left) : 0;
    indicator.setCssStyles({ top: `${y - area.top - 2}px`, insetInlineStart: `${start}px` });
  }

  private scroll(): void {
    const { scroller } = this;
    if (!scroller) {
      return;
    }
    const box = scroller.getBoundingClientRect();
    const edge = Math.min(EDGE, box.height / 3);
    const into = this.y < box.top + edge ? this.y - (box.top + edge) : this.y > box.bottom - edge ? this.y - (box.bottom - edge) : 0;
    if (into === 0 || edge <= 0) {
      return;
    }
    const step = Math.sign(into) * Math.ceil(SPEED * Math.min(1, Math.abs(into) / edge) ** 2);
    const before = scroller.scrollTop;
    scroller.scrollTop = before + step;
    if (scroller.scrollTop !== before) {
      this.follow();
    }
  }

  end(): void {
    if (this.ended) {
      return;
    }
    this.ended = true;
    const { grip, node } = this.options;
    grip.doc.removeEventListener("pointermove", this.moved);
    grip.doc.removeEventListener("pointerup", this.released);
    grip.doc.removeEventListener("pointercancel", this.cancelled);
    grip.doc.removeEventListener("lostpointercapture", this.cancelled);
    grip.win.removeEventListener("keydown", this.key, true);
    grip.win.cancelAnimationFrame(this.frame);
    this.ghost?.remove();
    this.indicator?.remove();
    node.removeClass("drag-ghost-hidden");
    if (this.started) {
      grip.doc.body.removeClass("is-grabbing");
      const swallow = (event: MouseEvent): void => {
        event.stopPropagation();
      };
      grip.win.addEventListener("click", swallow, { capture: true, once: true });
      grip.win.setTimeout(() => grip.win.removeEventListener("click", swallow, { capture: true }), 0);
    }
  }
}
