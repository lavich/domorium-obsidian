import type {
  GedcomLanguageService,
  MediaCrop,
  Position,
  Range,
} from "@domorium/language-service";

import type { DateReading } from "./dates";
import type { RecordLine } from "./recordLines";

export type IndexSource = Pick<GedcomLanguageService, "getDocumentSymbols" | "readDate">;

export type DateOf = (payload: string) => DateReading;

export interface PersonEvent {
  /** The tag as written. Naming it for a reader is the caller's. */
  tag: string;
  date?: DateReading;
  place?: string;
  /** What the line itself carried, as an occupation does. */
  value?: string;
  type?: string;
  range: Range;
  /** What this event itself cites, never what the record around it does. */
  citations: Citation[];
}

/**
 * Nothing here is read from disk: the file may not exist, may not be an image
 * whatever the document says, and is never fetched. The rectangle is how a
 * GEDCOM says "this person is the second face from the left".
 */
export interface PersonMedia {
  file: string;
  form?: string;
  title?: string;
  crop?: MediaCrop;
  /** On the link naming it, where the language service answers what it is. */
  at: Position;
  record?: string;
}

export interface MediaLink {
  record: string;
  title?: string;
  crop?: MediaCrop;
  at: Position;
}

export interface MediaRecord {
  xref: string;
  file?: string;
  title?: string;
  /** On the record's own `FILE` payload. */
  at?: Position;
  links: MediaLink[];
  range: Range;
}

/**
 * What any record needs to be a row in the sidebar's list, whatever it is.
 * Held for every one of them in the document, so it stays small.
 */
export interface Row {
  xref?: string;
  /** No identifier: cannot be addressed, linked to, or opened. */
  unaddressable: boolean;
  /** One lowercase string covering every field the sidebar filters on. */
  search: string;
}

export interface PersonRow extends Row {
  name: string;
  /** Set where the name's line writes both. */
  given?: string;
  surname?: string;
  otherNames: string[];
  sex?: string;
  birth?: DateReading;
  death?: DateReading;
  place?: string;
}

export interface FamilyRow extends Row {
  spouseNames: string[];
  name?: string;
  marriage?: DateReading;
  place?: string;
  childCount: number;
}

export interface FamilyMember extends PersonRow {
  role: string;
}

export interface SourceField {
  tag: string;
  value: string;
}

export interface SourceRow extends Row {
  title: string;
  author?: string;
  repository?: string;
}

export interface Source extends SourceRow {
  fields: SourceField[];
  media: PersonMedia[];
  portrait?: PersonMedia;
  unresolved: string[];
  range: Range;
}

/**
 * A `SOUR` line within a record, reported to both sides from one reading. It
 * either points at a source record or, as 5.5.1 allows, describes the source
 * on the spot.
 */
export interface Citation {
  record: string;
  /** The source it names, declared or not. Absent for a source described inline. */
  source?: string;
  inline?: string;
  /**
   * The tag of the structure the pointer sat beneath. Absent where it sat on
   * the record itself: a citation of a birth is not a citation of the person,
   * and a structure has no identifier to name it by.
   */
  within?: string;
  /**
   * Which of the record's events it sits under, by position among them, so
   * that two events of one kind keep their own citations.
   */
  event?: number;
  page?: string;
  /** `QUAY`, 0 to 3. */
  quality?: number;
  range: Range;
}

export interface Family extends FamilyRow {
  spouses: FamilyMember[];
  children: FamilyMember[];
  events: PersonEvent[];
  media: PersonMedia[];
  unresolved: string[];
  missingSpouses: Missing[];
  missingChildren: Missing[];
  range: Range;
}

export interface Missing {
  xref: string;
  range: Range;
}

/** A family a person is a spouse of, read from that person's side. */
export interface Union {
  family: FamilyRow;
  /** The other spouse, where the family names one the document declares. */
  spouse?: PersonRow;
  events: PersonEvent[];
  children: PersonRow[];
  missingSpouses: Missing[];
  missingChildren: Missing[];
}

/** How the file says a child belongs to a family: `PEDI` under `FAMC`. */
export type ChildLinkKind = "birth" | "adopted" | "foster" | "sealing" | "other" | "unstated";

export interface ChildLink {
  family: string;
  kind: ChildLinkKind;
}

export interface Person extends PersonRow {
  media: PersonMedia[];
  portrait?: PersonMedia;
  parents: PersonRow[];
  partners: PersonRow[];
  children: PersonRow[];
  events: PersonEvent[];
  childFamilies: FamilyRow[];
  /** One for each child-family the document declares, with the kind of the link the file states. */
  childLinks: ChildLink[];
  spouseFamilies: FamilyRow[];
  siblings: PersonRow[];
  unions: Union[];
  /** A child-family, or a parent in one, the document does not declare. */
  missingParents: Missing[];
  missingUnions: Missing[];
  unresolved: string[];
  range: Range;
}

export interface GenealogyIndex {
  people: PersonRow[];
  families: FamilyRow[];
  sources: SourceRow[];
  person(xref: string): Person | undefined;
  family(xref: string): Family | undefined;
  source(xref: string): Source | undefined;
  media(xref: string): MediaRecord | undefined;
  /** The lines of any record that has an identifier, whole, converted on request; none for one the document does not declare. */
  record(xref: string): RecordLine | undefined;
  citesBy(xref: string): Citation[];
  citedBy(xref: string): Citation[];
}
