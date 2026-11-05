import { t } from "./i18n";
import { tileTemplate } from "./desk/mapProjection";

export const QUIET_MS = 700;

export interface Timers {
  set(callback: () => void, ms: number): number;
  clear(id: number): void;
}

export class DeferredCommit {
  private readonly pending = new Map<string, { value: string; timer: number }>();

  constructor(
    private readonly commit: (key: string, value: string) => void,
    private readonly timers: Timers,
    private readonly wait = QUIET_MS,
  ) {}

  type(key: string, value: string): void {
    const held = this.pending.get(key);
    if (held !== undefined) {
      this.timers.clear(held.timer);
    }
    this.pending.set(key, { value, timer: this.timers.set(() => this.flush(key), this.wait) });
  }

  flush(key?: string): void {
    for (const [one, held] of [...this.pending]) {
      if (key === undefined || key === one) {
        this.timers.clear(held.timer);
        this.pending.delete(one);
        this.commit(one, held.value);
      }
    }
  }
}

export function noteFor(key: string, value: string): string {
  return key === "tileUrl" && value.trim() !== "" && tileTemplate(value) === null ? t("map.tiles.invalid") : "";
}

export interface TextRowHost {
  onInput(listener: (value: string) => void): void;
  onBlur(listener: () => void): void;
  onEnter(listener: () => void): void;
  setNote(text: string): void;
}

export function wireTextRow(host: TextRowHost, key: string, deferred: DeferredCommit): void {
  host.onInput((value) => {
    host.setNote(noteFor(key, value));
    deferred.type(key, value);
  });
  host.onBlur(() => deferred.flush(key));
  host.onEnter(() => deferred.flush(key));
}
