import type { DeskMode, Origin } from "./deskState";
import { eventOwner } from "./eventRows";

export interface CursorRest {
  interfaceOn: boolean;
  mode: DeskMode;
  selected: string | null;
  atCursor: string | undefined;
  hasCard: boolean;
}

export function shouldFollowCursor({ interfaceOn, mode, selected, atCursor, hasCard }: CursorRest): boolean {
  return interfaceOn && mode === "source" && atCursor !== undefined && hasCard && atCursor !== selected && atCursor !== eventOwner(selected);
}

export function adoptsFollow<T>(followed: T | null, candidate: T, active: T | null): boolean {
  return followed === candidate || (followed === null && (active === null || active === candidate));
}

export function fallbackFollowed<T>(recent: readonly T[], isOpen: (view: T) => boolean): T | null {
  return recent.find(isOpen) ?? null;
}

export function noteChangeMatters(changed: string, followedFiles: readonly string[], linkingNotes: ReadonlySet<string>): boolean {
  return followedFiles.includes(changed) || linkingNotes.has(changed);
}

export class CursorFollow {
  private timer: number | null = null;

  constructor(
    private readonly win: Pick<Window, "setTimeout" | "clearTimeout">,
    private readonly settle: () => void,
    private readonly delay = 250,
  ) {}

  rested(): void {
    this.cancel();
    this.timer = this.win.setTimeout(() => {
      this.timer = null;
      this.settle();
    }, this.delay);
  }

  selected(origin: Origin): void {
    if (origin !== "cursor") {
      this.cancel();
    }
  }

  cancel(): void {
    if (this.timer !== null) {
      this.win.clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
