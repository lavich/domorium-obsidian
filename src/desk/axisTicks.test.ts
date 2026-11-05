import { describe, expect, it } from "vitest";

import { MAX_TICKS_PER_KIND, showsMinorTicks, ticksBetween } from "./axisTicks";

describe("the ticks of the axis of years", () => {
  it("draws a tick for every year, a medium one every 5 and a major one every 10 where years are wide", () => {
    const ticks = ticksBetween(1900, 1920, 6);

    expect(ticks.major).toEqual([1900, 1910, 1920]);
    expect(ticks.medium).toEqual([1905, 1915]);
    expect(ticks.minor).toHaveLength(21 - 3 - 2);
    expect(ticks.minor).not.toContain(1905);
    expect(ticks.minor).not.toContain(1910);
  });

  it("leaves out the yearly ticks where they would be closer than 4.5 px", () => {
    expect(showsMinorTicks(4.4)).toBe(false);
    expect(showsMinorTicks(4.5)).toBe(true);
    const ticks = ticksBetween(1900, 1920, 2);

    expect(ticks.minor).toEqual([]);
    expect(ticks.medium).toEqual([1905, 1915]);
    expect(ticks.major).toEqual([1900, 1910, 1920]);
  });

  it("puts every tick of a negative year on the same grid", () => {
    expect(ticksBetween(-12, 3, 6).major).toEqual([-10, 0]);
    expect(ticksBetween(-12, 3, 6).medium).toEqual([-5, 5].filter((year) => year <= 3));
  });

  it("draws no kind of tick beyond its cap, however far the span runs", () => {
    const wide = ticksBetween(0, 3000, 16);
    expect(wide.minor).toEqual([]);
    expect(wide.medium).toHaveLength(300);
    expect(wide.major).toHaveLength(301);

    const far = ticksBetween(0, 20000, 16);
    expect(far.minor.length + far.medium.length + far.major.length).toBeLessThanOrEqual(MAX_TICKS_PER_KIND);
  });
});
