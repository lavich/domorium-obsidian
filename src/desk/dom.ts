import { t } from "../i18n";

/** How long the pointer rests on a person before their family is lit, so a sweep across cards does not flicker. */
export const HOVER_DELAY = 130;

/** Lights `target` after the pointer has rested, restarting as it moves to another, and cancelled by `cancel`. */
export class HoverDelay<T> {
  private timer: number | null = null;
  private waiting: T | null = null;

  constructor(
    private readonly win: Window,
    private readonly light: (target: T | null) => void,
  ) {}

  rest(target: T | null, shown: T | null): void {
    if (this.timer !== null && this.waiting === target) {
      return;
    }
    this.cancel();
    if (target === shown) {
      return;
    }
    this.waiting = target;
    this.timer = this.win.setTimeout(() => {
      this.timer = null;
      this.light(target);
    }, HOVER_DELAY);
  }

  cancel(): void {
    if (this.timer !== null) {
      this.win.clearTimeout(this.timer);
      this.timer = null;
    }
    this.waiting = null;
  }
}

export function linkButton(
  parent: HTMLElement,
  text: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = parent.createEl("button", { cls: "gedcom-desk-link", text });
  button.setAttribute("type", "button");
  button.addEventListener("click", onClick);
  return button;
}

/** Below and right of the point where it fits, else above it, so a button in it is never off the edge. */
export function placeInside(
  root: HTMLElement,
  element: HTMLElement,
  point: { clientX: number; clientY: number },
): void {
  const box = root.getBoundingClientRect();
  const left = Math.max(0, Math.min(point.clientX - box.left + 14, root.clientWidth - element.offsetWidth));
  const y = point.clientY - box.top;
  const height = element.offsetHeight;
  const top = y + 14 + height > root.clientHeight ? Math.max(0, y - 14 - height) : y + 14;
  element.setCssProps({ left: `${left}px`, top: `${top}px` });
}

const SIGNS: Record<string, string> = {
  minus: "−",
  plus: "+",
  maximize: "⤢",
  search: "⌕",
  x: "×",
  "chevron-up": "▲",
  "chevron-down": "▼",
};

export type TipPlace = "top" | "bottom" | "left" | "right";

/** Obsidian's own tooltip shows an element's `aria-label`; where it stands is asked by this attribute. */
export function tipPlace(element: Element, place: TipPlace): void {
  element.setAttribute("data-tooltip-position", place);
}

let labels = 0;

/** Obsidian shows any `aria-label` as a hover tooltip, so a large or text-bearing element is named by hidden text instead. */
export function nameBy(target: HTMLElement, host: HTMLElement, text: string): HTMLElement {
  const label = host.createSpan({ cls: "gedcom-visually-hidden", text });
  label.id = `gedcom-label-${(labels += 1)}`;
  target.setAttribute("aria-labelledby", label.id);
  return label;
}

export type IconSetter = (element: HTMLElement, icon: string) => void;

/** An icon from Obsidian where there is one to ask, else a sign for it. */
export function putIcon(element: HTMLElement, icon: string, setIcon?: IconSetter): void {
  if (setIcon) {
    setIcon(element, icon);
  } else {
    element.setText(SIGNS[icon] ?? icon);
  }
}

/** The corner over a canvas where the search and the zoom controls sit side by side. */
export function floatingDock(parent: HTMLElement, prefix: string): HTMLElement {
  return parent.createDiv({ cls: `${prefix}-dock` });
}

export interface ZoomActions {
  out: () => void;
  in: () => void;
  fit: () => void;
}

/** −, + and Fit, in the dock `parent`, after the search. */
export function zoomControls(
  parent: HTMLElement,
  prefix: string,
  setIcon: ((element: HTMLElement, icon: string) => void) | undefined,
  actions: ZoomActions,
): HTMLElement {
  const controls = parent.createDiv({ cls: `${prefix}-controls` });
  const button = (cls: string, label: string, icon: string, run: () => void): void => {
    const made = controls.createEl("button", {
      cls: ["clickable-icon", `${prefix}-${cls}`],
      attr: { type: "button", "aria-label": label },
    });
    tipPlace(made, "bottom");
    putIcon(made, icon, setIcon);
    made.addEventListener("click", run);
  };
  button("zoom-out", t("overview.zoomOut"), "minus", actions.out);
  button("zoom-in", t("overview.zoomIn"), "plus", actions.in);
  button("fit", t("overview.fit"), "maximize", actions.fit);
  return controls;
}

export function prefersReducedMotion(doc: Document): boolean {
  return doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
