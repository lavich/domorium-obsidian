// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetLanguage } from "./i18n";
import { DeferredCommit, noteFor, QUIET_MS, type TextRowHost, wireTextRow } from "./settingTextRow";

const timers = {
  set: (callback: () => void, ms: number) => window.setTimeout(callback, ms),
  clear: (id: number) => window.clearTimeout(id),
};

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  vi.useRealTimers();
  resetLanguage();
});

function row() {
  const commits: [string, string][] = [];
  const listeners: { input?: (value: string) => void; blur?: () => void; enter?: () => void } = {};
  const notes: string[] = [];
  const host: TextRowHost = {
    onInput: (listener) => (listeners.input = listener),
    onBlur: (listener) => (listeners.blur = listener),
    onEnter: (listener) => (listeners.enter = listener),
    setNote: (text) => notes.push(text),
  };
  wireTextRow(host, "tileUrl", new DeferredCommit((key, value) => commits.push([key, value]), timers));
  return { commits, listeners, notes };
}

describe("a text row of the settings", () => {
  it("commits nothing while the reader types a prefix", () => {
    const { commits, listeners } = row();
    for (const text of ["h", "ht", "https://tiles.example/{z}"]) {
      listeners.input?.(text);
      vi.advanceTimersByTime(QUIET_MS - 100);
    }

    expect(commits).toEqual([]);
  });

  it("commits on blur and on Enter", () => {
    const { commits, listeners } = row();
    listeners.input?.("https://a/{z}/{x}/{y}");
    listeners.blur?.();
    listeners.input?.("https://b/{z}/{x}/{y}");
    listeners.enter?.();

    expect(commits).toEqual([["tileUrl", "https://a/{z}/{x}/{y}"], ["tileUrl", "https://b/{z}/{x}/{y}"]]);
  });

  it("commits after 700 ms of quiet, once, as typed", () => {
    const { commits, listeners } = row();
    listeners.input?.(" https://a/{z}/{x}/{y} ");
    vi.advanceTimersByTime(QUIET_MS);
    vi.advanceTimersByTime(5000);

    expect(commits).toEqual([["tileUrl", " https://a/{z}/{x}/{y} "]]);
  });

  it("says an address that is not valid is not, and says nothing of an empty one", () => {
    const { listeners, notes } = row();
    listeners.input?.("http://a/{z}/{x}/{y}");
    listeners.input?.("");
    listeners.input?.("https://a/{z}/{x}/{y}");

    expect(notes).toEqual(["The tile server address is not valid", "", ""]);
    expect(noteFor("tileAttribution", "anything")).toBe("");
  });
});
