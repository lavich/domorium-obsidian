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

const SIGNS: Record<string, string> = { minus: "−", plus: "+", maximize: "⤢" };

export interface ZoomActions {
  out: () => void;
  in: () => void;
  fit: () => void;
}

/** −, + and Fit, floating over `parent` and first in its order for the keyboard. */
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
      attr: { type: "button", "aria-label": label, title: label },
    });
    if (setIcon) {
      setIcon(made, icon);
    } else {
      made.setText(SIGNS[icon] ?? icon);
    }
    made.addEventListener("click", run);
  };
  button("zoom-out", t("overview.zoomOut"), "minus", actions.out);
  button("zoom-in", t("overview.zoomIn"), "plus", actions.in);
  button("fit", t("overview.fit"), "maximize", actions.fit);
  return controls;
}
