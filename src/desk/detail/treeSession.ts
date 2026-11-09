const REMEMBERED = 20;

interface RecordMemory {
  open: Set<string>;
  scroll: number;
  pressed: string | null;
}

/** What the tree of one record asks of the reader's choices, and where it tells of a change. */
export interface TreeState {
  isOpen(key: string): boolean;
  setOpen(key: string, open: boolean): void;
  tags(): boolean;
  setTags(on: boolean): void;
  pressed(): string | null;
  press(key: string | null): void;
  /** Redraws every card; where it is absent the tree redraws itself. */
  changed?(): void;
}

/** The choices of the reader in the trees of the last twenty records shown, and whether tags are shown in all of them. */
export class TreeSession {
  private readonly records = new Map<string, RecordMemory>();
  private tagsShown = false;

  private memory(record: string): RecordMemory {
    const held = this.records.get(record) ?? { open: new Set<string>([""]), scroll: 0, pressed: null };
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

  stateFor(record: string, changed?: () => void): TreeState {
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
      tags: () => this.tagsShown,
      setTags: (on) => {
        this.tagsShown = on;
      },
      pressed: () => held.pressed,
      press: (key) => {
        held.pressed = key;
      },
      ...(changed === undefined ? {} : { changed }),
    };
  }

  scrollOf(record: string): number {
    return this.records.get(record)?.scroll ?? 0;
  }

  rememberScroll(record: string, scroll: number): void {
    this.memory(record).scroll = scroll;
  }
}

export function ephemeralTreeState(): TreeState {
  return new TreeSession().stateFor("");
}
