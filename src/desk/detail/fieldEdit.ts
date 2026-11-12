import { t } from "../../i18n";
import { labelId, renderField, setFieldText, type Field } from "./fields";
import type { FieldMessage, TreeState } from "./treeSession";

const FOLDED_LINES = 5;

export interface EditableFieldOptions {
  /** The node key the field's draft and message are kept under. */
  key: string;
  /** Whether a line break is the ordinary case of the value, as the service describes it: Enter then starts a new line. */
  prose: boolean;
  /** The value as the file writes it, which the field holds while it has the focus. */
  fileText: string;
  /** The value in the reader's words, which the field shows otherwise. */
  readerText: string;
  labelledBy: string;
  state: TreeState;
  focusKey: string;
  setIcon?(element: HTMLElement, icon: string): void;
  write(text: string, field: EditableField): void;
  focused(field: EditableField, on: boolean): void;
  /** Called once the focus has left the field and it wrote nothing. */
  left?(field: EditableField): void;
}

/** Puts a message under a control and ties it to the control for assistive technology; none clears it. */
export function showMessage(after: HTMLElement, control: HTMLElement, message: FieldMessage | undefined): void {
  const next = after.nextElementSibling;
  if (next?.hasClass("gedcom-tree-message")) {
    next.remove();
  }
  control.removeAttribute("aria-describedby");
  control.removeAttribute("aria-invalid");
  if (!message) {
    return;
  }
  const box = createDiv({ cls: ["gedcom-tree-message", `is-${message.kind}`], text: message.text });
  box.id = labelId();
  after.after(box);
  control.setAttribute("aria-describedby", box.id);
  if (message.kind === "error") {
    control.setAttribute("aria-invalid", "true");
  }
}

/** A value the reader changes where it is: written when it is left or on Enter, put back with Escape. */
export class EditableField {
  readonly field: Field;
  private written: string;
  private readonly lines: boolean;
  private readonly revert: HTMLElement;

  constructor(
    parent: HTMLElement,
    private readonly options: EditableFieldOptions,
  ) {
    this.written = options.fileText;
    this.lines = options.prose;
    const draft = this.draft();
    this.field = renderField(parent, draft ?? options.readerText, "text", {
      labelledBy: options.labelledBy,
      editable: true,
      cls: "is-editable",
    });
    const { area, box } = this.field;
    area.setAttribute("data-focus-key", options.focusKey);
    area.setAttribute("dir", "auto");
    if (!this.lines) {
      area.setAttribute("enterkeyhint", "done");
    }
    box.toggleClass("is-changed", draft !== undefined);
    this.fold(true);
    this.revert = box.createDiv({ cls: ["gedcom-field-revert", "clickable-icon"] });
    this.revert.setAttribute("role", "button");
    this.revert.setAttribute("tabindex", "-1");
    this.revert.setAttribute("aria-label", t("edit.revert"));
    this.revert.setAttribute("data-focus-key", `${options.focusKey}:revert`);
    if (options.setIcon) {
      options.setIcon(this.revert, "rotate-ccw");
    } else {
      this.revert.setText("↺");
    }
    this.revert.addEventListener("pointerdown", (event) => event.preventDefault());
    this.revert.addEventListener("click", () => {
      this.putBack();
      area.focus();
    });
    showMessage(box, area, options.state.message(options.key));

    area.addEventListener("focus", () => {
      options.focused(this, true);
      this.fold(false);
      if (this.draft() === undefined && area.value !== this.written) {
        const whole = area.selectionStart === 0 && area.selectionEnd === area.value.length;
        this.show(this.written);
        if (whole) {
          area.select();
        }
      }
    });
    area.addEventListener("input", () => {
      box.setAttribute("data-value", area.value);
      options.state.setDraft(options.key, area.value === this.written ? undefined : { text: area.value, over: options.fileText });
      box.toggleClass("is-changed", area.value !== this.written);
      if (options.state.message(options.key)) {
        options.state.setMessage(options.key, undefined);
        showMessage(box, area, undefined);
      }
    });
    let composing = false;
    area.addEventListener("compositionstart", () => {
      composing = true;
    });
    // Safari ends a composition before the keydown of the Enter that confirmed it, so the flag outlives the event.
    area.addEventListener("compositionend", () => {
      window.setTimeout(() => {
        composing = false;
      }, 0);
    });
    area.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        this.putBack();
      } else if (event.key === "Enter" && !this.lines && !event.isComposing && !composing) {
        event.preventDefault();
        this.commit();
      }
    });
    area.addEventListener("blur", () => {
      window.setTimeout(() => this.blurred(), 0);
    });
  }

  private draft(): string | undefined {
    const draft = this.options.state.draft(this.options.key);
    return draft && draft.over === this.options.fileText ? draft.text : undefined;
  }

  private show(text: string): void {
    setFieldText(this.field, text);
  }

  private fold(folded: boolean): void {
    this.field.box.toggleClass("is-folded", folded && this.lines && this.field.area.value.split("\n").length > FOLDED_LINES);
  }

  private blurred(): void {
    const { area } = this.field;
    if (!area.isConnected || area.ownerDocument.activeElement === area) {
      return;
    }
    this.options.focused(this, false);
    if (this.pending()) {
      this.commit();
      return;
    }
    if (this.draft() === undefined) {
      this.show(this.options.readerText);
    }
    this.fold(true);
    this.options.left?.(this);
  }

  putBack(): void {
    const { box, area } = this.field;
    this.options.state.setDraft(this.options.key, undefined);
    this.options.state.setMessage(this.options.key, undefined);
    this.show(this.written);
    box.removeClass("is-changed");
    showMessage(box, area, undefined);
  }

  /** The value as it would be written. */
  value(): string {
    return this.field.area.value;
  }

  pending(): boolean {
    return this.value() !== this.written;
  }

  owns(element: Element): boolean {
    return this.field.box.contains(element);
  }

  commit(): void {
    if (this.pending()) {
      this.options.write(this.value(), this);
    }
  }

  /** The file now holds this value, so leaving the field writes nothing more. */
  wrote(text: string): void {
    this.written = text;
    this.options.state.setDraft(this.options.key, undefined);
    this.field.box.removeClass("is-changed");
  }

  /** Shows why the value was not written, keeping what the reader typed. */
  refused(message: FieldMessage): void {
    this.options.state.setDraft(this.options.key, { text: this.field.area.value, over: this.options.fileText });
    this.options.state.setMessage(this.options.key, message);
    showMessage(this.field.box, this.field.area, message);
  }

  warned(message: FieldMessage | undefined): void {
    this.options.state.setMessage(this.options.key, message);
    showMessage(this.field.box, this.field.area, message);
  }
}
