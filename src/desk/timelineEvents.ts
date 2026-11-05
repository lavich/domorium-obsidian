export interface TimelineSurface {
  doc: Document;
  root: HTMLElement;
  board: HTMLElement;
  plot: HTMLElement;
  names: HTMLElement;
  axisClip: HTMLElement;
  pop: HTMLElement;
}

export interface TimelineReactions {
  pointer(kind: string): void;
  tip(target: EventTarget | null, event: MouseEvent): void;
  year(clientX: number | null): void;
  plotScrolled(): void;
  redrawIfNeeded(): void;
  namesScrolled(): void;
  axisScrolled(): void;
  activate(event: MouseEvent): void;
  escape(): void;
  closePop(): void;
}

export function listenTimeline(surface: TimelineSurface, react: TimelineReactions): void {
  const { doc, root, board, plot, names, axisClip, pop } = surface;
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
  names.addEventListener("scroll", () => react.namesScrolled());
  axisClip.addEventListener("scroll", () => react.axisScrolled());
  board.addEventListener("click", (event) => react.activate(event));
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      react.escape();
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
