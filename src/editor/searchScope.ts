import type { SearchKeyBinding } from "./searchKeys";

export interface ScopeLike {
  register(
    modifiers: SearchKeyBinding["modifiers"],
    key: string,
    callback: (event: KeyboardEvent) => boolean | void,
  ): unknown;
}

export interface ScopeHost<Scope extends ScopeLike, Ref> {
  createScope(): Scope;
  push(scope: Scope): void;
  pop(scope: Scope): void;
  isActive(): boolean;
  onActiveChange(callback: () => void): Ref;
  offActiveChange(ref: Ref): void;
}

/**
 * The bar's keys answer wherever the focus sits, which is what a scope on
 * app.keymap gives and a CodeMirror keymap cannot: the panel's own DOM is
 * outside contentDOM. Parenting it on app.scope lets every key the bar does
 * not register fall through untouched.
 *
 * A scope on app.keymap answers app-wide, though, and the panel outlives the
 * leaf being looked at — so the scope follows the active leaf rather than the
 * panel alone. Without it F3 would search, and Mod+Alt+Enter rewrite, a file
 * in a background tab.
 */
export function pushSearchScope<Scope extends ScopeLike, Ref>(
  bindings: SearchKeyBinding[],
  host: ScopeHost<Scope, Ref>,
): () => void {
  const scope = host.createScope();
  for (const binding of bindings) {
    // Obsidian reads false as "the key was mine" and preventDefaults it.
    scope.register(binding.modifiers, binding.key, (event) => !binding.run(event));
  }
  let pushed = false;
  const follow = (): void => {
    const active = host.isActive();
    if (active === pushed) {
      return;
    }
    if (active) {
      host.push(scope);
    } else {
      host.pop(scope);
    }
    pushed = active;
  };
  follow();
  // Not registerEvent: closing the view destroys the editor and with it the
  // panel, so the panel's own destroy always drops this — while a registered
  // unload would pile up, one per open of the bar.
  const ref = host.onActiveChange(follow);
  return () => {
    host.offActiveChange(ref);
    if (pushed) {
      host.pop(scope);
      pushed = false;
    }
  };
}
