const RETRY_AFTER = 60_000;
const STORM_WINDOW = 10_000;
const STORM_COUNT = 3;

export class TileFailures {
  private readonly failedAt = new Map<string, number>();
  private recent: number[] = [];

  constructor(private readonly now: () => number) {}

  failed(key: string): void {
    const at = this.now();
    this.failedAt.set(key, at);
    this.recent = [...this.recent.filter((one) => at - one <= STORM_WINDOW), at];
  }

  loaded(key: string): void {
    this.failedAt.delete(key);
    this.recent = [];
  }

  retry(key: string): boolean {
    const at = this.failedAt.get(key);
    return at === undefined || this.now() - at >= RETRY_AFTER;
  }

  status(): boolean {
    const at = this.now();
    return this.recent.filter((one) => at - one <= STORM_WINDOW).length >= STORM_COUNT;
  }

  keep(planned: ReadonlySet<string>): void {
    for (const key of this.failedAt.keys()) {
      if (!planned.has(key)) {
        this.failedAt.delete(key);
      }
    }
  }
}
