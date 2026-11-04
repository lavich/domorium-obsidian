import { describe, expect, it } from "vitest";

import { RecordHistory } from "./recordHistory";

const all = () => true;

describe("the card's history of records", () => {
  it("goes back to the record before and forward again", () => {
    const history = new RecordHistory();
    history.visit("@I1@");
    history.visit("@I2@");

    expect(history.back(all)).toBe("@I1@");
    expect(history.current()).toBe("@I1@");
    expect(history.forward(all)).toBe("@I2@");
  });

  it("drops the forward steps when a record is visited after going back", () => {
    const history = new RecordHistory();
    history.visit("@I1@");
    history.visit("@I2@");
    history.back(all);
    history.visit("@I3@");

    expect(history.canForward(all)).toBe(false);
    expect(history.back(all)).toBe("@I1@");
  });

  it("takes a visit of the current record for no step", () => {
    const history = new RecordHistory();
    history.visit("@I1@");
    history.visit("@I1@");

    expect(history.canBack(all)).toBe(false);
  });

  it("replaces a follow by the next follow and keeps the visit before it", () => {
    const history = new RecordHistory();
    history.visit("@I1@");
    history.follow("@I2@");
    history.follow("@I12@");

    expect(history.back(all)).toBe("@I1@");
    expect(history.forward(all)).toBe("@I12@");
    expect(history.canForward(all)).toBe(false);
  });

  it("keeps a record the reader chose after it was followed", () => {
    const history = new RecordHistory();
    history.visit("@I1@");
    history.follow("@I2@");
    history.visit("@I2@");
    history.follow("@I12@");

    expect(history.back(all)).toBe("@I2@");
    expect(history.back(all)).toBe("@I1@");
  });

  it("skips a record that is gone and answers null where none is left", () => {
    const history = new RecordHistory();
    history.visit("@I1@");
    history.visit("@I2@");
    history.visit("@I3@");
    const withoutPierre = (xref: string) => xref !== "@I2@";

    expect(history.canBack(withoutPierre)).toBe(true);
    expect(history.back(withoutPierre)).toBe("@I1@");
    expect(history.canBack(withoutPierre)).toBe(false);
    expect(history.back(withoutPierre)).toBeNull();
    expect(history.current()).toBe("@I1@");
    expect(history.forward(withoutPierre)).toBe("@I3@");
    expect(history.forward(withoutPierre)).toBeNull();
  });

  it("drops the oldest step after fifty", () => {
    const history = new RecordHistory();
    for (let i = 1; i <= 51; i += 1) {
      history.visit(`@I${i}@`);
    }
    let last: string | null = null;
    for (let step = history.back(all); step !== null; step = history.back(all)) {
      last = step;
    }

    expect(last).toBe("@I2@");
  });

  it("is empty after a reset", () => {
    const history = new RecordHistory();
    history.visit("@I1@");
    history.visit("@I2@");
    history.reset();

    expect(history.current()).toBeNull();
    expect(history.canBack(all)).toBe(false);
  });

  it("gives Back a base when seeded with a restored record", () => {
    const history = new RecordHistory();
    history.visit("@I1@");
    history.follow("@I2@");

    expect(history.back(all)).toBe("@I1@");
  });
});
