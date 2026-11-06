import { plural, t } from "../i18n";
import { nameBy, putIcon, tipPlace, type IconSetter } from "./dom";
import type { GraphCanvas } from "./graphCanvas";

export interface MatchInfo {
  /** The match the view stands on, or -1 before any step. */
  index: number;
  total: number;
}

export interface FloatingSearchOptions {
  prefix: string;
  setIcon?: IconSetter;
  change: (query: string) => void;
  step: (by: 1 | -1) => void;
  info: () => MatchInfo;
  /** A list narrows rather than steps: no arrows, a counter of its own, and Enter hands the keyboard on. */
  narrowing?: { count: () => string; enter: () => void };
}

/** A search icon over a canvas that gives way to a field with a match counter and arrows, and comes back while the field is empty. */
export class FloatingSearch {
  readonly el: HTMLElement;
  private readonly toggle: HTMLButtonElement;
  private readonly input: HTMLInputElement;
  private readonly count: HTMLElement;
  private readonly previous: HTMLButtonElement | null;
  private readonly next: HTMLButtonElement | null;
  private readonly clear: HTMLButtonElement;
  private readonly label: HTMLElement;
  private readonly inner: HTMLButtonElement[];

  constructor(
    parent: HTMLElement,
    private readonly options: FloatingSearchOptions,
  ) {
    const { prefix } = options;
    this.el = parent.createDiv({ cls: `${prefix}-find` });
    this.toggle = this.button(`${prefix}-find-toggle`, "search", t("overview.search"));
    this.toggle.setAttribute("aria-expanded", "false");
    this.input = this.el.createEl("input", {
      cls: `${prefix}-search`,
      type: "search",
      placeholder: t("overview.search"),
      attr: { tabindex: "-1" },
    });
    this.label = nameBy(this.input, this.el, t("overview.search"));
    this.count = this.el.createSpan({ cls: `${prefix}-find-count`, attr: { "aria-live": "polite" } });
    const stepping = options.narrowing === undefined;
    this.previous = stepping ? this.button(`${prefix}-find-prev`, "chevron-up", t("overview.previousMatch")) : null;
    this.next = stepping ? this.button(`${prefix}-find-next`, "chevron-down", t("overview.nextMatch")) : null;
    this.clear = this.button(`${prefix}-find-clear`, "x", t("overview.clearSearch"));
    this.inner = [this.previous, this.next, this.clear].filter((one): one is HTMLButtonElement => one !== null);
    for (const inside of this.inner) {
      inside.tabIndex = -1;
    }

    this.toggle.addEventListener("click", () => this.open());
    this.previous?.addEventListener("click", (event) => this.go(-1, event));
    this.next?.addEventListener("click", (event) => this.go(1, event));
    this.clear.addEventListener("click", () => {
      if (this.input.value === "") {
        this.close();
        this.toggle.focus();
      } else {
        this.input.value = "";
        this.changed();
        this.input.focus();
      }
    });
    this.input.addEventListener("input", () => this.changed());
    this.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (this.options.narrowing) {
          this.options.narrowing.enter();
        } else {
          this.go(event.shiftKey ? -1 : 1, event);
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (this.input.value === "") {
          this.close();
          this.toggle.focus();
        } else {
          this.input.value = "";
          this.changed();
        }
      }
    });
    this.el.addEventListener("focusout", () => {
      const win = this.el.ownerDocument.defaultView ?? window;
      win.setTimeout(() => {
        const active = this.el.ownerDocument.activeElement;
        if (this.isOpen() && this.input.value === "" && !(active && this.el.contains(active))) {
          this.close();
        }
      }, 0);
    });
    this.refresh();
  }

  isOpen(): boolean {
    return this.el.classList.contains("is-open");
  }

  open(): void {
    this.el.addClass("is-open");
    this.toggle.setAttribute("aria-expanded", "true");
    this.toggle.tabIndex = -1;
    this.input.tabIndex = 0;
    for (const inside of this.inner) {
      inside.tabIndex = 0;
    }
    this.input.focus();
  }

  /** Keeps what is typed and takes the keyboard back. */
  focus(select = false): void {
    this.input.focus();
    if (select) {
      this.input.select();
    }
  }

  /** Empties the field without closing it, as a list does when it clears a query that hides a row. */
  reset(): void {
    this.input.value = "";
    this.refresh();
  }

  describe(text: string): void {
    this.input.placeholder = text;
    this.label.setText(text);
  }

  close(): void {
    this.el.removeClass("is-open");
    this.toggle.setAttribute("aria-expanded", "false");
    this.toggle.tabIndex = 0;
    this.input.tabIndex = -1;
    for (const inside of this.inner) {
      inside.tabIndex = -1;
    }
  }

  /** Reads the matches again, as after the file or the scope changed under the query. */
  refresh(): void {
    const { index, total } = this.options.info();
    const querying = this.input.value.trim() !== "";
    if (this.options.narrowing) {
      this.count.setText(querying ? this.options.narrowing.count() : "");
      return;
    }
    this.count.setText(
      !querying
        ? ""
        : total === 0
          ? t("overview.noMatches")
          : index < 0
            ? plural("overview.matches", total)
            : t("overview.matchOf", { current: index + 1, total }),
    );
    if (this.previous && this.next) {
      this.previous.disabled = !querying || total === 0;
      this.next.disabled = !querying || total === 0;
    }
  }

  /** A press of an arrow with a mouse or a key leaves the focus in the field, so Enter and typing go on; a touch leaves the keyboard alone. */
  private go(by: 1 | -1, event: Event): void {
    this.options.step(by);
    this.refresh();
    if (event.target !== this.input && (event as PointerEvent).pointerType !== "touch") {
      this.input.focus({ preventScroll: true });
    }
  }

  private changed(): void {
    this.options.change(this.input.value);
    this.refresh();
  }

  private button(cls: string, icon: string, label: string): HTMLButtonElement {
    const made = this.el.createEl("button", {
      cls: ["clickable-icon", cls],
      attr: { type: "button", "aria-label": label },
    });
    tipPlace(made, "bottom");
    putIcon(made, icon, this.options.setIcon);
    return made;
  }
}

/** The search over a graph canvas, first in its order: a query lights the matching cards and a step glides to the next. */
export function searchOver(canvas: GraphCanvas, setIcon?: IconSetter): FloatingSearch {
  const find = new FloatingSearch(canvas.dock, {
    prefix: "gedcom-fg",
    ...(setIcon ? { setIcon } : {}),
    change: (query) => canvas.setQuery(query),
    step: (by) => canvas.stepMatch(by),
    info: () => canvas.matchInfo(),
  });
  canvas.dock.prepend(find.el);
  return find;
}
