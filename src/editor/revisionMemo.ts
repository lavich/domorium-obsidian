export class RevisionMemo<T> {
  private held: { revision: number; value: T } | null = null;

  get(revision: number, compute: () => T): T {
    if (this.held?.revision !== revision) {
      this.held = { revision, value: compute() };
    }
    return this.held.value;
  }
}
