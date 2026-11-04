import type { GenealogyIndex } from "../genealogy";
import {
  effectiveMode,
  isViewMode,
  pageKind,
  toggleTarget,
  type DeskMode,
  type DeskState,
  type Origin,
} from "./deskState";

export type { Origin } from "./deskState";

export interface ModeChange {
  changed: boolean;
  /** To Source with a record selected: the cursor goes to the lines the card shows. */
  moveCursor: boolean;
  /** Leaving Source took the record under the cursor. */
  selectionChanged: boolean;
}

export interface Leaving {
  /** The record under the cursor, which is the record the tab selects once Source is left. */
  cursorRecord: string | undefined;
  index(): GenealogyIndex;
}

export interface OriginRules {
  cursorToRecord: boolean;
  editorFocus: boolean;
  revealsView: boolean;
  addsStep: "visit" | "follow" | "none";
  placesCard: boolean;
  opensDrawer: boolean;
}

export function originRules(origin: Origin, mobile: boolean): OriginRules {
  return {
    cursorToRecord: origin === "index" || origin === "card" || origin === "link",
    editorFocus: origin === "index" || origin === "link",
    revealsView: origin !== "view" && origin !== "cursor",
    addsStep: origin === "cursor" ? "follow" : origin === "history" ? "none" : "visit",
    placesCard: origin !== "cursor",
    opensDrawer: mobile && (origin === "index" || origin === "view"),
  };
}

const UNCHANGED: ModeChange = { changed: false, moveCursor: false, selectionChanged: false };

/** Which mode a tab is in, which record is selected, and whether a view may be drawn. */
export class TabModes {
  /** What the tab stored, which shows only while the interface is on. */
  mode: DeskMode;
  /** The last mode other than Source, which the toggle returns to. */
  lastMode: DeskMode | undefined;
  selected: string | null = null;
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
    let selectionChanged = false;
    if (before === "source") {
      const atCursor = leaving.cursorRecord;
      if (atCursor && pageKind(leaving.index(), atCursor)) {
        selectionChanged = atCursor !== this.selected;
        this.selected = atCursor;
      }
    } else {
      this.lastMode = before;
    }
    this.mode = next;
    return { changed: true, moveCursor: next === "source" && this.selected !== null, selectionChanged };
  }

  /** The state a tab was handed: its mode, and the record it selects. */
  applyState(desk: DeskState): { selectionChanged: boolean } {
    if (desk.mode !== undefined && desk.mode !== this.mode) {
      if (this.mode !== "source") {
        this.lastMode = this.mode;
      }
      this.mode = desk.mode;
    }
    if (this.interfaceOn && desk.selected !== undefined && desk.selected !== this.selected) {
      this.selected = desk.selected;
      return { selectionChanged: true };
    }
    return { selectionChanged: false };
  }

  select(xref: string, index: GenealogyIndex): boolean {
    if (!this.interfaceOn || !pageKind(index, xref)) {
      return false;
    }
    this.selected = xref;
    return true;
  }

  textChanged(index: GenealogyIndex): { selectionCleared: boolean } {
    if (this.selected !== null && !pageKind(index, this.selected)) {
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
    this.selected = null;
    this.loaded = false;
  }

  needsDraw(shown: boolean): boolean {
    return this.loaded && this.inView() && shown;
  }

  toggleTarget(): DeskMode {
    return toggleTarget(this.mode, this.lastMode);
  }

  recordAtCursorFor(mode: DeskMode, cursorRecord: string | undefined): string | undefined {
    return isViewMode(mode) ? (this.selected ?? undefined) : cursorRecord;
  }

  /** The record the card shows and the Index marks. */
  shownRecord(): string | null {
    return this.interfaceOn ? this.selected : null;
  }

  private endSelection(): boolean {
    const had = this.selected !== null;
    this.selected = null;
    return had;
  }
}
