export const MIN_TICK_GAP = 4.5;
export const MAX_TICKS_PER_KIND = 1000;
export const MEDIUM_EVERY = 5;
export const MAJOR_EVERY = 10;

export interface AxisTicks {
  minor: number[];
  medium: number[];
  major: number[];
}

export const showsMinorTicks = (pixelsPerYear: number): boolean => pixelsPerYear >= MIN_TICK_GAP;

function multiples(from: number, to: number, every: number, skip: number | null): number[] {
  if ((to - from) / every > MAX_TICKS_PER_KIND) {
    return [];
  }
  const years: number[] = [];
  for (let year = Math.ceil(from / every) * every; year <= to; year += every) {
    if (skip === null || year % skip !== 0) {
      years.push(year);
    }
  }
  return years;
}

export function ticksBetween(from: number, to: number, pixelsPerYear: number): AxisTicks {
  return {
    minor: showsMinorTicks(pixelsPerYear) ? multiples(from, to, 1, MEDIUM_EVERY) : [],
    medium: multiples(from, to, MEDIUM_EVERY, MAJOR_EVERY),
    major: multiples(from, to, MAJOR_EVERY, null),
  };
}
