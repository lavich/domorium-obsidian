import { personOf } from "./timelineHits";

export interface TimelineSurface {
  doc: Document;
  root: HTMLElement;
  board: HTMLElement;
  plot: HTMLElement;
  axisClip: HTMLElement;
  pop: HTMLElement;
}

export interface TimelineReactions {
  pointer(kind: string): void;
  tip(target: EventTarget | null, event: MouseEvent): void;
  year(clientX: number | null): void;
  plotScrolled(): void;
  redrawIfNeeded(): void;
  bar(xref: string): void;
  step(xref: string, by: 1 | -1): void;
  pinchStart(clientX: number): void;
  pinchMove(scale: number): void;
  pinchEnd(scale: number): void;
  axisScrolled(): void;
  activate(event: MouseEvent): void;
  escape(): void;
  closePop(): void;
}

const ARROWS: Record<string, 1 | -1> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

export function listenTimeline(surface: TimelineSurface, react: TimelineReactions): void {
  const { doc, root, board, plot, axisClip, pop } = surface;
  let pending = false;

  board.addEventListener("pointerdown", (event) => {
    react.pointer(event.pointerType || "mouse");
  });
  board.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") {
      return;
    }
    react.pointer(event.pointerType || "mouse");
    react.tip(event.target, event);
    const onPlot = event.target instanceof Node && (plot.contains(event.target) || axisClip.contains(event.target));
    react.year(onPlot ? event.clientX : null);
  });
  board.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "touch") {
      return;
    }
    react.year(null);
    react.tip(null, event);
  });
  plot.addEventListener("scroll", () => {
    react.plotScrolled();
    if (pending) {
      return;
    }
    pending = true;
    (doc.defaultView ?? window).requestAnimationFrame(() => {
      pending = false;
      react.redrawIfNeeded();
    });
  });
  axisClip.addEventListener("scroll", () => react.axisScrolled());
  board.addEventListener("click", (event) => react.activate(event));
  listenPinch(plot, react);
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      react.escape();
      return;
    }
    const bar = event.target instanceof Element ? event.target.closest(".gedcom-ft-life") : null;
    const by = ARROWS[event.key];
    if (by !== undefined && bar !== null && personOf(bar) !== null) {
      event.preventDefault();
      react.step(personOf(bar) ?? "", by);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && bar !== null && personOf(bar) !== null) {
      event.preventDefault();
      react.bar(personOf(bar) ?? "");
    }
  });
  root.addEventListener("click", (event) => {
    if (!(event.target instanceof Node) || !pop.contains(event.target)) {
      if (!board.contains(event.target as Node)) {
        react.closePop();
      }
    }
  });
}

function listenPinch(plot: HTMLElement, react: TimelineReactions): void {
  let pinching = false;
  let scale = 1;
  const read = (touches: TouchList): { distance: number; mid: number } | null => {
    const [a, b] = [touches[0], touches[1]];
    return a && b
      ? { distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), mid: (a.clientX + b.clientX) / 2 }
      : null;
  };
  let distance = 1;
  plot.addEventListener(
    "touchstart",
    (event) => {
      const fingers = read(event.touches);
      if (fingers && !pinching) {
        event.preventDefault();
        pinching = true;
        distance = Math.max(1, fingers.distance);
        scale = 1;
        react.pinchStart(fingers.mid);
      }
    },
    { passive: false },
  );
  plot.addEventListener(
    "touchmove",
    (event) => {
      const fingers = read(event.touches);
      if (pinching && fingers) {
        event.preventDefault();
        scale = fingers.distance / distance;
        react.pinchMove(scale);
      }
    },
    { passive: false },
  );
  const lift = (event: TouchEvent): void => {
    if (pinching && event.touches.length < 2) {
      pinching = false;
      react.pinchEnd(scale);
    }
  };
  plot.addEventListener("touchend", lift);
  plot.addEventListener("touchcancel", lift);
}
