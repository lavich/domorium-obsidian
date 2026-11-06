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
  axisScrolled(): void;
  activate(event: MouseEvent): void;
  escape(): void;
  closePop(): void;
}

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
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      react.escape();
      return;
    }
    const bar = event.target instanceof Element ? event.target.closest(".gedcom-ft-life") : null;
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
