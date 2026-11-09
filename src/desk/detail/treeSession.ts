const REMEMBERED = 20;

interface RecordMemory {
  open: Set<string>;
}

/** What the tree of one record asks of the reader's choices, and where it tells of a change. */
export interface TreeState {
  isOpen(key: string): boolean;
  setOpen(key: string, open: boolean): void;
}

/** The choices of the reader in the trees of the last twenty records shown: the nodes and notes opened. */
export class TreeSession {
  private readonly records = new Map<string, RecordMemory>();

  private memory(record: string): RecordMemory {
    const held = this.records.get(record) ?? { open: new Set<string>([""]) };
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
    };
  }
}

export function ephemeralTreeState(): TreeState {
  return new TreeSession().stateFor("");
}
