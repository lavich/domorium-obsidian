import type { Position, StructureFieldDescription } from "@domorium/language-service";

const REMEMBERED = 20;

/** What the card said under a field: a refusal, or a warning that came with a write. */
export interface FieldMessage {
  text: string;
  kind: "error" | "warning";
}

/** A value the reader typed and the card has not written, kept with the value it was typed over. */
export interface Draft {
  text: string;
  over: string;
}

export interface UnwrittenChild {
  field: StructureFieldDescription;
  value: string;
}

/** A field chosen in a line's menu that is not in the file until it has what the standard requires. */
export interface Unwritten {
  id: number;
  field: StructureFieldDescription;
  value: string;
  pointer?: string;
  children: UnwrittenChild[];
  /** The line it goes under, as it read when the row was made; the row is dropped once that line reads otherwise. */
  parent: { tag: string; text: string | undefined; range: { start: Position } };
}

/** Where the focus goes once the tree is drawn again: a control of a node, or a part of the line written at `line` under a node. */
export type FocusWish =
  | { key: string; parts: string[] }
  | { under: string; line: number; parts: string[] }
  | { unwritten: number };

/** What the tree of one record asks of the reader's choices, and where it tells of a change. */
export interface TreeState {
  isOpen(key: string): boolean;
  setOpen(key: string, open: boolean): void;
  draft(key: string): Draft | undefined;
  setDraft(key: string, draft: Draft | undefined): void;
  message(key: string): FieldMessage | undefined;
  setMessage(key: string, message: FieldMessage | undefined): void;
  unwritten(parent: string): Unwritten[];
  setUnwritten(parent: string, rows: Unwritten[]): void;
  /** Every parent key an unwritten row is kept under. */
  unwrittenParents(): string[];
  wishFocus(wish: FocusWish | undefined): void;
  takeFocus(): FocusWish | undefined;
}

interface RecordMemory {
  open: Set<string>;
  drafts: Map<string, Draft>;
  messages: Map<string, FieldMessage>;
  unwritten: Map<string, Unwritten[]>;
  focus?: FocusWish;
}

let made = 0;

/** A number for a new unwritten row, unique while the plugin is loaded. */
export function unwrittenId(): number {
  made += 1;
  return made;
}

const put = <T>(map: Map<string, T>, key: string, value: T | undefined): void => {
  if (value === undefined) {
    map.delete(key);
  } else {
    map.set(key, value);
  }
};

/** The choices of the reader in the trees of the last twenty records shown: the nodes and notes opened, and what is typed and not written. */
export class TreeSession {
  private readonly records = new Map<string, RecordMemory>();

  private memory(record: string): RecordMemory {
    const held = this.records.get(record) ?? {
      open: new Set<string>([""]),
      drafts: new Map<string, Draft>(),
      messages: new Map<string, FieldMessage>(),
      unwritten: new Map<string, Unwritten[]>(),
    };
    this.records.delete(record);
    this.records.set(record, held);
    for (const oldest of this.records.keys()) {
      if (this.records.size <= REMEMBERED) {
        break;
      }
      this.records.delete(oldest);
    }
    return held;
  }

  stateFor(record: string): TreeState {
    const held = this.memory(record);
    return {
      isOpen: (key) => held.open.has(key),
      setOpen: (key, open) => {
        if (open) {
          held.open.add(key);
        } else {
          held.open.delete(key);
        }
      },
      draft: (key) => held.drafts.get(key),
      setDraft: (key, draft) => put(held.drafts, key, draft),
      message: (key) => held.messages.get(key),
      setMessage: (key, message) => put(held.messages, key, message),
      unwritten: (parent) => held.unwritten.get(parent) ?? [],
      setUnwritten: (parent, rows) => put(held.unwritten, parent, rows.length > 0 ? rows : undefined),
      unwrittenParents: () => [...held.unwritten.keys()],
      wishFocus: (wish) => {
        held.focus = wish;
      },
      takeFocus: () => {
        const wish = held.focus;
        held.focus = undefined;
        return wish;
      },
    };
  }
}

export function ephemeralTreeState(): TreeState {
  return new TreeSession().stateFor("");
}
