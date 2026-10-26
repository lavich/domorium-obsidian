import { GedcomLanguageService } from "@domorium/language-service";

import curie from "../../demo-vault/curie.ged?raw";
import { buildIndex, type GenealogyIndex } from "../genealogy";

export const CURIE = curie;

export function curieIndex(): GenealogyIndex {
  return buildIndex(new GedcomLanguageService(CURIE));
}
