const LIMIT = 50;

interface Step {
  xref: string;
  followed: boolean;
}

export class RecordHistory {
  private steps: Step[] = [];
  private at = -1;

  visit(xref: string): void {
    const current = this.steps[this.at];
    if (current?.xref === xref) {
      current.followed = false;
      return;
    }
    this.push({ xref, followed: false });
  }

  follow(xref: string): void {
    const current = this.steps[this.at];
    if (current?.xref === xref) {
      return;
    }
    if (current?.followed) {
      this.steps.splice(this.at + 1);
      this.steps[this.at] = { xref, followed: true };
      return;
    }
    this.push({ xref, followed: true });
  }

  back(exists: (xref: string) => boolean): string | null {
    const to = this.nearest(-1, exists);
    return this.move(to);
  }

  forward(exists: (xref: string) => boolean): string | null {
    return this.move(this.nearest(1, exists));
  }

  canBack(exists: (xref: string) => boolean): boolean {
    return this.nearest(-1, exists) !== -1;
  }

  canForward(exists: (xref: string) => boolean): boolean {
    return this.nearest(1, exists) !== -1;
  }

  current(): string | null {
    return this.steps[this.at]?.xref ?? null;
  }

  reset(): void {
    this.steps = [];
    this.at = -1;
  }

  private push(step: Step): void {
    this.steps.splice(this.at + 1);
    this.steps.push(step);
    if (this.steps.length > LIMIT) {
      this.steps.shift();
    }
    this.at = this.steps.length - 1;
  }

  private nearest(direction: 1 | -1, exists: (xref: string) => boolean): number {
    for (let i = this.at + direction; i >= 0 && i < this.steps.length; i += direction) {
      const step = this.steps[i];
      if (step && exists(step.xref)) {
        return i;
      }
    }
    return -1;
  }

  private move(to: number): string | null {
    if (to === -1) {
      return null;
    }
    this.at = to;
    return this.steps[to]?.xref ?? null;
  }
}
