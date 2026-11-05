import { describe, expect, it } from "vitest";

import { TileFailures } from "./mapTiles";

function failures() {
  let clock = 0;
  return { failures: new TileFailures(() => clock), tick: (ms: number) => (clock += ms) };
}

describe("the tiles that failed", () => {
  it("are not retried for a minute", () => {
    const { failures: held, tick } = failures();
    held.failed("5/1/1");
    tick(59_000);

    expect(held.retry("5/1/1")).toBe(false);
    tick(1_000);
    expect(held.retry("5/1/1")).toBe(true);
  });

  it("allows a tile that never failed", () => {
    expect(failures().failures.retry("5/1/1")).toBe(true);
  });

  it("raise the status after three failures within ten seconds with no success", () => {
    const { failures: held, tick } = failures();
    held.failed("a");
    tick(3_000);
    held.failed("b");
    expect(held.status()).toBe(false);
    tick(3_000);
    held.failed("c");

    expect(held.status()).toBe(true);
  });

  it("do not raise it when they are spread over more than ten seconds", () => {
    const { failures: held, tick } = failures();
    for (const key of ["a", "b", "c"]) {
      held.failed(key);
      tick(6_000);
    }

    expect(held.status()).toBe(false);
  });

  it("are cleared by a success", () => {
    const { failures: held } = failures();
    for (const key of ["a", "b", "c"]) {
      held.failed(key);
    }
    held.loaded("d");

    expect(held.status()).toBe(false);
  });

  it("are forgotten once no longer planned", () => {
    const { failures: held } = failures();
    held.failed("a");
    held.keep(new Set(["b"]));

    expect(held.retry("a")).toBe(true);
  });
});
