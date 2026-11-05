import { describe, expect, it } from "vitest";

import { pushSearchScope, type ScopeHost, type ScopeLike } from "./searchScope";
import type { SearchKeyBinding } from "./searchKeys";

class FakeScope implements ScopeLike {
  readonly keys = new Map<string, (event: KeyboardEvent) => boolean | void>();

  register(
    _modifiers: SearchKeyBinding["modifiers"],
    key: string,
    callback: (event: KeyboardEvent) => boolean | void,
  ): void {
    this.keys.set(key, callback);
  }
}

function setup(initiallyActive: boolean) {
  const scope = new FakeScope();
  const log: string[] = [];
  const state = { active: initiallyActive, listeners: [] as (() => void)[] };
  const host: ScopeHost<FakeScope, number> = {
    createScope: () => scope,
    push: () => log.push("push"),
    pop: () => log.push("pop"),
    isActive: () => state.active,
    onActiveChange: (callback) => state.listeners.push(callback) - 1,
    offActiveChange: () => log.push("off"),
  };
  const activate = (active: boolean): void => {
    state.active = active;
    state.listeners.forEach((listener) => listener());
  };
  return { scope, log, host, activate };
}

const binding = (key: string, mine: boolean): SearchKeyBinding => ({
  modifiers: [],
  key,
  run: () => mine,
});

describe("the key scope of the search bar", () => {
  it("hands Obsidian false for a key that was the bar's", () => {
    const { scope, host } = setup(true);
    pushSearchScope([binding("F3", true), binding("G", false)], host);
    const event = {} as KeyboardEvent;
    expect(scope.keys.get("F3")?.(event)).toBe(false);
    expect(scope.keys.get("G")?.(event)).toBe(true);
  });

  it("is pushed at once when the view is active", () => {
    const { log, host } = setup(true);
    pushSearchScope([], host);
    expect(log).toEqual(["push"]);
  });

  it("follows the active leaf away and back", () => {
    const { log, host, activate } = setup(true);
    pushSearchScope([], host);
    activate(false);
    activate(false);
    activate(true);
    expect(log).toEqual(["push", "pop", "push"]);
  });

  it("is not pushed while another leaf is active", () => {
    const { log, host } = setup(false);
    pushSearchScope([], host);
    expect(log).toEqual([]);
  });

  it("stops listening and pops the scope when dropped", () => {
    const { log, host } = setup(true);
    pushSearchScope([], host)();
    expect(log).toEqual(["push", "off", "pop"]);
  });

  it("only stops listening when dropped from the background", () => {
    const { log, host } = setup(false);
    pushSearchScope([], host)();
    expect(log).toEqual(["off"]);
  });
});
