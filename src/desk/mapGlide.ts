import { GLIDE_MS } from "./graphCanvas";
import { glideAt, glides, type MapView, type Size } from "./mapProjection";

export interface GlideEnv {
  size(): Size;
  now(): number;
  frame(callback: () => void): number;
  cancel(id: number): void;
  reduced(): boolean;
}

export class MapGlide {
  private running: number | null = null;

  constructor(
    private readonly apply: (view: MapView) => void,
    private readonly env: GlideEnv,
  ) {}

  get active(): boolean {
    return this.running !== null;
  }

  to(from: MapView, target: MapView): void {
    this.stop();
    const size = this.env.size();
    if (this.env.reduced() || !glides(from, target, size)) {
      this.apply(target);
      return;
    }
    const start = this.env.now();
    const step = (): void => {
      const t = (this.env.now() - start) / GLIDE_MS;
      if (t >= 1) {
        this.running = null;
        this.apply(target);
        return;
      }
      this.apply(glideAt(from, target, size, t));
      this.running = this.env.frame(step);
    };
    this.running = this.env.frame(step);
  }

  stop(): void {
    if (this.running !== null) {
      this.env.cancel(this.running);
      this.running = null;
    }
  }
}
