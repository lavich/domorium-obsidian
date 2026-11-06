const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch",
  ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya", і: "i", ї: "i", є: "e", ґ: "g",
};

const LATIN: Record<string, string> = { ł: "l", ø: "o", đ: "d", ß: "ss", æ: "ae", œ: "oe", ð: "d", þ: "th" };

const ENDINGS = [
  "skaya", "skiy", "skoy", "sky", "ski", "ska", "ske",
  "ova", "ov", "ieva", "iev", "eva", "ev", "ina", "in", "aya", "iy", "oy",
].sort((a, b) => b.length - a.length);

const LETTERS = 26;
const DEPTH = 4;
const DECAY = 0.35;
const MIN_STEM = 2;

export type Scheme = "light" | "dark";

const TONES: Record<Scheme, { saturations: number[]; lightnesses: number[] }> = {
  light: { saturations: [0.45, 0.65], lightnesses: [0.68, 0.75, 0.82] },
  dark: { saturations: [0.35, 0.5], lightnesses: [0.2, 0.25, 0.3] },
};

export const SHADES = 6;
const PLAIN = 2;

function toneOf(scheme: Scheme, shade: number): { saturation: number; lightness: number } {
  const { saturations, lightnesses } = TONES[scheme];
  return {
    saturation: saturations[Math.floor(shade / lightnesses.length) % saturations.length] ?? 0,
    lightness: lightnesses[shade % lightnesses.length] ?? 0,
  };
}

const INKS = { white: "#ffffff", black: "#14110f" } as const;

export function foldSurname(surname: string): string {
  const lower = surname.toLowerCase().replace(/й/gu, "y");
  const folded = lower.normalize("NFD").replace(/\p{M}/gu, "");
  return [...folded].map((letter) => CYRILLIC[letter] ?? LATIN[letter] ?? letter).join("").replace(/[^a-z]/gu, "");
}

export function stemOf(surname: string): string {
  const folded = foldSurname(surname);
  const ending = ENDINGS.find((end) => folded.endsWith(end) && folded.length - end.length >= MIN_STEM);
  return ending === undefined ? folded : folded.slice(0, -ending.length);
}

export function surnameHue(surname: string): number {
  const stem = stemOf(surname);
  if (stem === "") {
    let hash = 0;
    for (const letter of surname) {
      hash = (hash * 31 + (letter.codePointAt(0) ?? 0)) % 360;
    }
    return hash;
  }
  let fraction = 0;
  let total = 0;
  for (let at = 0; at < DEPTH; at += 1) {
    const weight = DECAY ** at;
    fraction += (((stem.charCodeAt(at) || 96) - 96) / LETTERS) * weight;
    total += weight;
  }
  return ((fraction / total) * 360) % 360;
}

export function surnameShade(surname: string): number {
  const stem = stemOf(surname) || surname;
  let hash = 2166136261;
  for (const letter of stem) {
    hash = Math.imul(hash ^ (letter.codePointAt(0) ?? 0), 16777619) >>> 0;
  }
  return (hash >>> 8) % SHADES;
}

export function hueDistance(a: number, b: number): number {
  const gap = Math.abs(a - b) % 360;
  return Math.min(gap, 360 - gap);
}

function rgbOf(hue: number, saturation: number, lightness: number): [number, number, number] {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const part = (n: number): number => {
    const k = (n + hue / 30) % 12;
    return lightness - (chroma / 2) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [part(0), part(8), part(4)];
}

function luminance([r, g, b]: [number, number, number]): number {
  const linear = (value: number): number => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

const INK_LUMINANCE = { white: 1, black: luminance([0.0784, 0.0667, 0.0588]) } as const;

const ratio = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

function fillLuminance(hue: number, scheme: Scheme, grey: boolean, shade: number): number {
  const { saturation, lightness } = toneOf(scheme, grey ? PLAIN : shade);
  return luminance(rgbOf(hue, grey ? 0 : saturation, lightness));
}

function inkOf(hue: number, scheme: Scheme, grey: boolean, shade: number): keyof typeof INKS {
  const fill = fillLuminance(hue, scheme, grey, shade);
  return ratio(fill, INK_LUMINANCE.black) >= ratio(fill, INK_LUMINANCE.white) ? "black" : "white";
}

export function contrastOnFill(hue: number, scheme: Scheme, grey = false, shade = PLAIN): number {
  return ratio(fillLuminance(hue, scheme, grey, shade), INK_LUMINANCE[inkOf(hue, scheme, grey, shade)]);
}

export function surnamePaint(surname: string | undefined): Record<string, string> {
  const grey = surname === undefined;
  const hue = grey ? 0 : Math.round(surnameHue(surname) * 10) / 10;
  const shade = grey ? PLAIN : surnameShade(surname);
  const fill = (scheme: Scheme): string => {
    const { saturation, lightness } = toneOf(scheme, shade);
    return `hsl(${hue} ${grey ? 0 : saturation * 100}% ${lightness * 100}%)`;
  };
  return {
    "--gedcom-surname-fill-light": fill("light"),
    "--gedcom-surname-fill-dark": fill("dark"),
    "--gedcom-surname-ink-light": INKS[inkOf(hue, "light", grey, shade)],
    "--gedcom-surname-ink-dark": INKS[inkOf(hue, "dark", grey, shade)],
  };
}

export function paintStyle(surname: string | undefined): string {
  return Object.entries(surnamePaint(surname))
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
}
