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

const TONES: Record<Scheme, { saturation: number; lightness: number }> = {
  light: { saturation: 0.55, lightness: 0.8 },
  dark: { saturation: 0.45, lightness: 0.32 },
};

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

function fillLuminance(hue: number, scheme: Scheme, grey: boolean): number {
  const { saturation, lightness } = TONES[scheme];
  return luminance(rgbOf(hue, grey ? 0 : saturation, lightness));
}

function inkOf(hue: number, scheme: Scheme, grey: boolean): keyof typeof INKS {
  const fill = fillLuminance(hue, scheme, grey);
  return ratio(fill, INK_LUMINANCE.black) >= ratio(fill, INK_LUMINANCE.white) ? "black" : "white";
}

export function contrastOnFill(hue: number, scheme: Scheme, grey = false): number {
  return ratio(fillLuminance(hue, scheme, grey), INK_LUMINANCE[inkOf(hue, scheme, grey)]);
}

export function barPaint(surname: string | undefined): Record<string, string> {
  const grey = surname === undefined;
  const hue = grey ? 0 : Math.round(surnameHue(surname) * 10) / 10;
  const fill = (scheme: Scheme): string => {
    const { saturation, lightness } = TONES[scheme];
    return `hsl(${hue} ${grey ? 0 : saturation * 100}% ${lightness * 100}%)`;
  };
  return {
    "--gedcom-ft-fill-light": fill("light"),
    "--gedcom-ft-fill-dark": fill("dark"),
    "--gedcom-ft-ink-light": INKS[inkOf(hue, "light", grey)],
    "--gedcom-ft-ink-dark": INKS[inkOf(hue, "dark", grey)],
  };
}
