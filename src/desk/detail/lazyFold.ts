import { renderFold } from "../fold";

export interface LazyFold {
  id: string;
  title: string;
  count: number;
  open: boolean;
  toggled: (open: boolean) => void;
}

/** A folded section whose body is drawn only while it is open, so a closed one costs nothing. */
export function lazyFold(parent: HTMLElement, options: LazyFold, fill: (body: HTMLElement) => void): void {
  let filled = false;
  const held: { body?: HTMLElement } = {};
  held.body = renderFold(parent, {
    ...options,
    toggled: (open) => {
      if (open && !filled && held.body) {
        filled = true;
        fill(held.body);
      }
      options.toggled(open);
    },
  });
  if (options.open) {
    filled = true;
    fill(held.body);
  }
}
