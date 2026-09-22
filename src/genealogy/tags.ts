/**
 * Which structures the model reads as what.
 *
 * These sets are named rather than inferred, and that is a decision with a
 * reason. Nothing in the document data distinguishes an event from anything
 * else: a bare `1 DEAT` carries no payload and no children, which makes it
 * indistinguishable from `1 SEX M` or `1 FAMC @F1@`. The schema that knows the
 * difference lives inside the validator and is not exported. So the tables are
 * written out, from the structures GEDCOM defines for an individual and a
 * family record in both supported dialects.
 */

/** Events and recorded attributes of a person, in both dialects. */
export const PERSON_EVENT_TAGS: ReadonlySet<string> = new Set([
  // Events.
  "ADOP", "BAPM", "BARM", "BASM", "BIRT", "BLES", "BURI", "CENS", "CHR",
  "CHRA", "CONF", "CREM", "DEAT", "EMIG", "FCOM", "GRAD", "IMMI", "NATU",
  "ORDN", "PROB", "RETI", "WILL", "EVEN",
  // 5.5.1 also writes these as events of a person.
  "BAPL", "CONL", "ENDL", "SLGC",
  // Recorded attributes, which a reader reads beside events.
  "CAST", "DSCR", "EDUC", "IDNO", "NATI", "NCHI", "NMR", "OCCU", "PROP",
  "RELI", "RESI", "SSN", "TITL", "FACT",
]);

/**
 * The roles a family record names its spouses in. A pointer to a person in any
 * other role — an associate, a witness, a submitter — is not a spouse.
 */
export const SPOUSE_ROLE_TAGS: ReadonlySet<string> = new Set(["HUSB", "WIFE"]);

/** The role a family record names its children in. */
export const CHILD_ROLE_TAGS: ReadonlySet<string> = new Set(["CHIL"]);

/** How a person points at the family they were a child in, and a spouse of. */
export const CHILD_FAMILY_TAG = "FAMC";
export const SPOUSE_FAMILY_TAG = "FAMS";
