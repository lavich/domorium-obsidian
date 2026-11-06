const TRANSLITERATION: Record<string, string> = { ł: "l", ß: "ss", ø: "o", đ: "d", æ: "ae", œ: "oe", ı: "i" };

export function foldText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[łßøđæœı]/gu, (letter) => TRANSLITERATION[letter] ?? letter);
}
