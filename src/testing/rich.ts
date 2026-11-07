import { GedcomLanguageService } from "@domorium/language-service";

import rich from "../../demo-vault/rich-record.ged?raw";
import rich551 from "../../demo-vault/rich-record-551.ged?raw";
import { buildIndex, type GenealogyIndex } from "../genealogy";

export const RICH = rich;
export const RICH_551 = rich551;

const indexOf = (text: string): GenealogyIndex => buildIndex(new GedcomLanguageService(text));

/** A person, a family and their events that state everything the standard lets a record state. */
export const richIndex = (): GenealogyIndex => indexOf(rich);
export const richIndex551 = (): GenealogyIndex => indexOf(rich551);
