import { ItemView, type ViewStateResult, type WorkspaceLeaf } from "obsidian";

/**
 * TASK 1.1, THROWAWAY. Delete this file, its registration in main.ts, and its
 * command once the question below is answered.
 *
 * The question: when a custom view moves between its own states with
 * `setViewState`, do Obsidian's own Back and Forward walk those states?
 */
export const SPIKE_VIEW_TYPE = "domorium-navigation-spike";

interface SpikeState {
  step?: number;
}

export class NavigationSpikeView extends ItemView {
  /** The property under test: whether declaring the view navigable is enough. */
  navigation = true;

  private step = 1;
  private readonly log: string[] = [];

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return SPIKE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return `Spike step ${this.step}`;
  }

  getState(): Record<string, unknown> {
    return { step: this.step };
  }

  setState(state: unknown, result: ViewStateResult): Promise<void> {
    const next = (state as SpikeState | undefined)?.step;
    if (typeof next === "number" && next !== this.step) {
      this.note(`setState -> step ${next} (was ${this.step})`);
      this.step = next;
    } else if (typeof next === "number") {
      this.note(`setState -> step ${next} (unchanged)`);
    }
    result.history = false;
    this.draw();
    return Promise.resolve();
  }

  async onOpen(): Promise<void> {
    this.note("onOpen");
    this.draw();
  }

  private note(line: string): void {
    const at = new Date().toLocaleTimeString();
    this.log.unshift(`${at}  ${line}`);
  }

  private draw(): void {
    const root = this.contentEl;
    root.empty();
    root.createEl("h2", { text: `Step ${this.step}` });
    root.createEl("p", {
      text: "Press the button three times, then press Cmd+[ twice and read the log.",
    });

    const go = root.createEl("button", { text: `Go to step ${this.step + 1}` });
    go.addEventListener("click", () => {
      const step = this.step + 1;
      this.note(`button -> setViewState step ${step}`);
      void this.leaf.setViewState({
        type: SPIKE_VIEW_TYPE,
        active: true,
        state: { step },
      });
    });

    root.createEl("h3", { text: "Log, newest first" });
    const list = root.createEl("ol");
    for (const line of this.log) {
      list.createEl("li", { text: line });
    }
  }
}
