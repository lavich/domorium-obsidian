import { describe, expect, it, vi } from "vitest";

import { RevisionMemo } from "./revisionMemo";

describe("the records of a revision", () => {
  it("are computed once however often a ten thousand person file is asked for them", () => {
    const records = Array.from({ length: 10_000 }, (_, at) => `@I${at}@`);
    const compute = vi.fn(() => records);
    const memo = new RevisionMemo<string[]>();

    for (let rest = 0; rest < 100; rest += 1) {
      expect(memo.get(1, compute)).toBe(records);
    }

    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("are computed again for the next revision", () => {
    const compute = vi.fn(() => []);
    const memo = new RevisionMemo<string[]>();
    memo.get(1, compute);
    memo.get(2, compute);

    expect(compute).toHaveBeenCalledTimes(2);
  });
});
