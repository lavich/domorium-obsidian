import type { GenealogyIndex } from "../genealogy";
import {
  effectiveMode,
  isViewMode,
  navigationStep,
  pageKind,
  toggleTarget,
  type DeskMode,
  type DeskState,
} from "./deskState";

export interface ModeChange {
  changed: boolean;
  /** Only Genealogy to Source: the cursor goes to the lines the page showed. */
  moveCursor: boolean;
  recordChanged: boolean;
  selectionCleared: boolean;
}

export interface Leaving {
  /** The record under the cursor, which is the record the tab holds once Source is left. */
  cursorRecord: string | undefined;
  index(): GenealogyIndex;
}

const UNCHANGED: ModeChange = { changed: false, moveCursor: false, recordChanged: false, selectionCleared: false };

/** Which mode a tab is in, which record it holds, who is selected, and whether a view may be drawn. */
export class TabModes {
  /** What the tab stored, which shows only while the interface is on. */
  mode: DeskMode;
  /** The last mode other than Source, which the toggle returns to. */
  lastMode: DeskMode | undefined;
  record: string | null = null;
  selectedPerson: string | null = null;
  loaded = false;

  constructor(
    mode: DeskMode,
    private interfaceOn: boolean,
  ) {
    this.mode = mode;
  }

  get shown(): DeskMode {
    return effectiveMode(this.mode, this.interfaceOn);
  }

  inView(): boolean {
    return isViewMode(this.shown);
  }

  setMode(next: DeskMode, leaving: Leaving): ModeChange {
    if (!this.interfaceOn || next === this.mode) {
      return UNCHANGED;
    }
    const before = this.mode;
    let recordChanged = false;
    if (before === "source") {
      const atCursor = leaving.cursorRecord;
      if (atCursor && pageKind(leaving.index(), atCursor)) {
        recordChanged = atCursor !== this.record;
        this.record = atCursor;
      }
    } else {
      this.lastMode = before;
    }
    const selectionCleared = this.endSelection();
    this.mode = next;
    return { changed: true, moveCursor: before === "genealogy" && next === "source", recordChanged, selectionCleared };
  }

  /** What opening a record's page sets, and whether Back should return from it. */
  openRecord(xref: string): { mode: "genealogy"; record: string; step: boolean } {
    const next = { mode: "genealogy" as const, record: xref };
    return { ...next, step: navigationStep({ mode: this.mode, record: this.record }, next) };
  }

  /** The state a tab was handed: the step it is, and what it ended. */
  applyState(desk: DeskState): { step: boolean; recordChanged: boolean; selectionCleared: boolean } {
    const step = navigationStep({ mode: this.mode, record: this.record }, desk);
    const recordChanged = desk.record !== undefined && desk.record !== this.record;
    if (recordChanged) {
      this.record = desk.record ?? null;
    }
    let selectionCleared = false;
    if (desk.mode !== undefined && desk.mode !== this.mode) {
      if (this.mode !== "source") {
        this.lastMode = this.mode;
      }
      this.mode = desk.mode;
      selectionCleared = this.endSelection();
    }
    return { step, recordChanged, selectionCleared };
  }

  select(xref: string, isPerson: boolean): boolean {
    if (!isPerson || !this.inView()) {
      return false;
    }
    this.selectedPerson = xref;
    return true;
  }

  textChanged(index: GenealogyIndex): { selectionCleared: boolean } {
    if (this.selectedPerson !== null && !index.person(this.selectedPerson)) {
      return { selectionCleared: this.endSelection() };
    }
    return { selectionCleared: false };
  }

  interfaceChanged(on: boolean): { selectionCleared: boolean } {
    this.interfaceOn = on;
    return { selectionCleared: on ? false : this.endSelection() };
  }

  fileChanged(mode: DeskMode): void {
    this.mode = mode;
    this.lastMode = undefined;
    this.record = null;
    this.selectedPerson = null;
    this.loaded = false;
  }

  needsDraw(shown: boolean): boolean {
    return this.loaded && this.inView() && shown;
  }

  toggleTarget(): DeskMode {
    return toggleTarget(this.mode, this.lastMode);
  }

  recordAtCursorFor(mode: DeskMode, cursorRecord: string | undefined): string | undefined {
    if (mode === "genealogy") {
      return this.record ?? undefined;
    }
    return isViewMode(mode) ? (this.selectedPerson ?? undefined) : cursorRecord;
  }

  /** The record the Index marks and Evidence shows: the page's, or the person selected in a view. */
  shownRecord(): string | null {
    const mode = this.shown;
    if (mode === "genealogy") {
      return this.record;
    }
    return isViewMode(mode) ? this.selectedPerson : null;
  }

  private endSelection(): boolean {
    const had = this.selectedPerson !== null;
    this.selectedPerson = null;
    return had;
  }
}
