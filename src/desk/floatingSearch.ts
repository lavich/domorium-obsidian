import { t } from "../i18n";

export interface FloatingSearchOptions {
  prefix: string;
  setIcon: (element: HTMLElement, icon: string) => void;
  change: (query: string) => void;
  step?: (backwards: boolean) => void;
}

/** A search icon over a canvas that opens into a field, and goes back to the icon while the field is empty. */
export class FloatingSearch {
  readonly el: HTMLElement;
  private readonly toggle: HTMLButtonElement;
  private readonly input: HTMLInputElement;
  private readonly clear: HTMLButtonElement;

  constructor(
    parent: HTMLElement,
    private readonly options: FloatingSearchOptions,
  ) {
    const { prefix } = options;
    this.el = parent.createDiv({ cls: `${prefix}-find` });
    this.toggle = this.button("clickable-icon", `${prefix}-find-toggle`, "search", t("overview.search"));
    this.toggle.setAttribute("aria-expanded", "false");
    this.input = this.el.createEl("input", {
      cls: `${prefix}-search`,
      type: "search",
      placeholder: t("overview.search"),
      attr: { "aria-label": t("overview.search"), tabindex: "-1" },
    });
    this.clear = this.button("clickable-icon", `${prefix}-find-clear`, "x", t("overview.clearSearch"));
    this.clear.tabIndex = -1;

    this.toggle.addEventListener("click", () => this.open());
    this.clear.addEventListener("click", () => {
      if (this.input.value === "") {
        this.close();
        this.toggle.focus();
      } else {
        this.input.value = "";
        this.options.change("");
        this.input.focus();
      }
    });
    this.input.addEventListener("input", () => this.options.change(this.input.value));
    this.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.options.step?.(event.shiftKey);
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (this.input.value === "") {
          this.close();
          this.toggle.focus();
        } else {
          this.input.value = "";
          this.options.change("");
        }
      }
    });
    this.el.addEventListener("focusout", (event) => {
      const next = event.relatedTarget;
      if (this.input.value === "" && !(next instanceof Node && this.el.contains(next))) {
        this.close();
      }
    });
  }

  isOpen(): boolean {
    return this.el.classList.contains("is-open");
  }

  open(): void {
    this.el.addClass("is-open");
    this.toggle.setAttribute("aria-expanded", "true");
    this.toggle.tabIndex = -1;
    this.input.tabIndex = 0;
    this.clear.tabIndex = 0;
    this.input.focus();
  }

  close(): void {
    this.el.removeClass("is-open");
    this.toggle.setAttribute("aria-expanded", "false");
    this.toggle.tabIndex = 0;
    this.input.tabIndex = -1;
    this.clear.tabIndex = -1;
  }

  private button(kind: string, cls: string, icon: string, label: string): HTMLButtonElement {
    const made = this.el.createEl("button", {
      cls: [kind, cls],
      attr: { type: "button", "aria-label": label, title: label },
    });
    this.options.setIcon(made, icon);
    return made;
  }
}
