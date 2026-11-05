import type { Point } from "./fileGraph";
import { ZOOM } from "./graphCanvas";

const DRAG = 4;
const WHEEL_STEP = 1.12;
const TRACKPAD_DELTA = 40;
/** A wheel event this soon after the last one belongs to the same gesture. */
const GESTURE_GAP = 150;

export interface GraphInputHost {
  readonly el: HTMLElement;
  transform(): { x: number; y: number; k: number } | null;
  apply(at: { x: number; y: number; k: number }): void;
  stopGlide(): void;
  zoomAt(factor: number, cx: number, cy: number): void;
  panBy(dx: number, dy: number): void;
  hideTip(): void;
  onControls(target: EventTarget | null): boolean;
  hovered(event: PointerEvent): void;
  left(): void;
}

/** Dragging, pinching and the wheel, which move the view; what the pointer rests on is the canvas's. */
export class GraphInput {
  /** The kind of pointer last seen. */
  pointer = "mouse";
  private swallow = false;
  private readonly down = new Map<number, { x: number; y: number }>();
  private drag: { id: number; x: number; y: number; vx: number; vy: number; moving: boolean } | null = null;
  private pinch: { distance: number; k: number; mid: Point; vx: number; vy: number } | null = null;
  private wheel: { at: number; pans: boolean } | null = null;

  constructor(private readonly host: GraphInputHost) {}

  /** Whether a click that ends a drag or pinch is still to be swallowed; asking spends it. */
  swallows(): boolean {
    if (!this.swallow) {
      return false;
    }
    this.swallow = false;
    return true;
  }

  listen(): void {
    const el = this.host.el;
    el.addEventListener("pointerdown", (event) => this.pressed(event));
    el.addEventListener("pointermove", (event) => this.moved(event));
    el.addEventListener("pointerup", (event) => this.lift(event));
    el.addEventListener("pointercancel", (event) => this.lift(event));
    el.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch" || this.drag) {
        return;
      }
      this.host.left();
    });
    el.addEventListener("wheel", (event) => this.wheeled(event), { passive: false });
  }

  private local(event: { clientX: number; clientY: number }): Point {
    const box = this.host.el.getBoundingClientRect();
    return [event.clientX - box.left, event.clientY - box.top];
  }

  private lift(event: PointerEvent): void {
    this.down.delete(event.pointerId);
    if (this.drag?.moving || this.pinch) {
      this.swallow = true;
    }
    if (this.drag?.id === event.pointerId || this.down.size === 0) {
      this.drag = null;
      this.host.el.removeClass("is-dragging");
    }
    if (this.down.size < 2) {
      this.pinch = null;
    }
  }

  private pressed(event: PointerEvent): void {
    if (event.button !== 0 || this.host.onControls(event.target)) {
      return;
    }
    this.host.stopGlide();
    this.pointer = event.pointerType || "mouse";
    this.swallow = false;
    this.down.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const at = this.host.transform();
    if (!at) {
      return;
    }
    if (this.down.size === 2) {
      const [one, other] = [...this.down.values()];
      if (one && other) {
        const mid = this.local({ clientX: (one.x + other.x) / 2, clientY: (one.y + other.y) / 2 });
        this.pinch = { distance: Math.hypot(one.x - other.x, one.y - other.y) || 1, k: at.k, mid, vx: at.x, vy: at.y };
        this.drag = null;
      }
      return;
    }
    if (this.down.size === 1) {
      this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, vx: at.x, vy: at.y, moving: false };
    }
  }

  private moved(event: PointerEvent): void {
    if (event.buttons === 0 && this.down.has(event.pointerId)) {
      this.lift(event);
    }
    if (this.down.has(event.pointerId)) {
      this.down.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (this.pinch && this.down.size >= 2) {
      this.pinchMoved();
      return;
    }
    const drag = this.drag;
    if (drag && drag.id === event.pointerId) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.moving && Math.hypot(dx, dy) >= DRAG) {
        drag.moving = true;
        this.host.el.addClass("is-dragging");
        this.host.hideTip();
        try {
          this.host.el.setPointerCapture(event.pointerId);
        } catch {
          // A synthetic pointer cannot be captured, and needs no capture to drag.
        }
      }
      if (drag.moving) {
        const k = this.host.transform()?.k ?? 1;
        this.host.apply({ x: drag.vx + dx, y: drag.vy + dy, k });
      }
      return;
    }
    if (event.pointerType === "touch") {
      return;
    }
    this.pointer = event.pointerType || "mouse";
    this.host.hovered(event);
  }

  private pinchMoved(): void {
    const pinch = this.pinch;
    const [one, other] = [...this.down.values()];
    if (!pinch || !one || !other) {
      return;
    }
    const distance = Math.hypot(one.x - other.x, one.y - other.y) || 1;
    const k = Math.max(ZOOM.min, Math.min(ZOOM.max, (pinch.k * distance) / pinch.distance));
    const mid = this.local({ clientX: (one.x + other.x) / 2, clientY: (one.y + other.y) / 2 });
    const [cx, cy] = pinch.mid;
    this.host.apply({
      x: mid[0] - ((cx - pinch.vx) * k) / pinch.k,
      y: mid[1] - ((cy - pinch.vy) * k) / pinch.k,
      k,
    });
  }

  private wheeled(event: WheelEvent): void {
    event.preventDefault();
    this.host.stopGlide();
    const [x, y] = this.local(event);
    if (event.ctrlKey) {
      this.host.zoomAt(Math.exp(-event.deltaY / 100), x, y);
      return;
    }
    const fresh = this.wheel === null || event.timeStamp - this.wheel.at > GESTURE_GAP;
    const pans = fresh
      ? event.deltaX !== 0 || (event.deltaMode === 0 && Math.abs(event.deltaY) < TRACKPAD_DELTA)
      : (this.wheel?.pans ?? false);
    this.wheel = { at: event.timeStamp, pans };
    if (pans) {
      this.host.panBy(-event.deltaX, -event.deltaY);
      return;
    }
    this.host.zoomAt(event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP, x, y);
  }
}
