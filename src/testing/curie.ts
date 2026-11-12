import { GedcomLanguageService } from "@domorium/language-service";

import curie from "../../demo-vault/curie.ged?raw";
import { buildIndex, type GenealogyIndex } from "../genealogy";

export const CURIE = curie;

export function indexOf(text: string): GenealogyIndex {
  return buildIndex(new GedcomLanguageService(text));
}

export function curieIndex(): GenealogyIndex {
  return indexOf(CURIE);
}

// Real events of the family, kept out of the demo vault, which dates only births, marriages and deaths.
const EVENTS: Record<string, string[]> = {
  "@I1@": [
    "1 EMIG",
    "2 DATE 1891",
    "2 PLAC Warsaw, Congress Poland",
    "1 EDUC University of Paris",
    "2 DATE FROM 1891 TO 1894",
    "2 PLAC Paris, France",
    "1 EVEN Nobel Prize in Physics",
    "2 TYPE Award",
    "2 DATE DEC 1903",
    "2 PLAC Stockholm, Sweden",
    "1 EVEN Nobel Prize in Chemistry",
    "2 TYPE Award",
    "2 DATE DEC 1911",
    "2 PLAC Stockholm, Sweden",
  ],
  "@I2@": [
    "1 EVEN Nobel Prize in Physics",
    "2 TYPE Award",
    "2 DATE DEC 1903",
    "2 PLAC Stockholm, Sweden",
    "1 RESI",
    "2 DATE FROM 1895 TO 1906",
    "2 PLAC Paris, France",
  ],
  "@I12@": [
    "1 EVEN Nobel Prize in Chemistry",
    "2 TYPE Award",
    "2 DATE DEC 1935",
    "2 PLAC Stockholm, Sweden",
  ],
  "@I14@": [
    "1 EVEN Nobel Prize in Chemistry",
    "2 TYPE Award",
    "2 DATE DEC 1935",
    "2 PLAC Stockholm, Sweden",
  ],
  "@I13@": ["1 IMMI", "2 DATE 1940", "2 PLAC United States"],
};

const UNDATED_PERSON = [
  "0 @I18@ INDI",
  "1 NAME Kazimierz /Żorawski/",
  "2 GIVN Kazimierz",
  "2 SURN Żorawski",
  "1 SEX M",
  "1 OCCU Mathematician",
];

export function curieWithEvents(): string {
  const out: string[] = [];
  let record: string | null = null;
  let inBirth = false;
  const close = (): void => {
    out.push(...(record ? (EVENTS[record] ?? []) : []));
    record = null;
  };
  for (const line of CURIE.split(/\r?\n/u)) {
    if (line.startsWith("0 ")) {
      close();
      if (line === "0 TRLR") {
        out.push(...UNDATED_PERSON);
      }
      record = /^0 (@[^@]+@) INDI$/u.exec(line)?.[1] ?? null;
    }
    if (line.startsWith("1 ")) {
      inBirth = line === "1 BIRT";
    }
    out.push(record === "@I3@" && inBirth && line === "2 DATE 1832" ? "2 DATE ABT 1832" : line);
  }
  return out.join("\n");
}

/** The demo file with a record of its own, which the demo vault does not have. */
export function curieWithPlan(): string {
  return CURIE.replace(/^0 TRLR$/mu, ["0 @P1@ _PLAN Custom value", "1 NAME Research plan", "1 _STEP Visit the archive", "0 TRLR"].join("\n"));
}
