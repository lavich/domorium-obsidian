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

export const PERSON_EVENT_TAGS: ReadonlySet<string> = new Set([
  "ADOP", "BAPM", "BARM", "BASM", "BIRT", "BLES", "BURI", "CENS", "CHR",
  "CHRA", "CONF", "CREM", "DEAT", "EMIG", "FCOM", "GRAD", "IMMI", "NATU",
  "ORDN", "PROB", "RETI", "WILL", "EVEN",
  "BAPL", "CONL", "ENDL", "SLGC",
  "CAST", "DSCR", "EDUC", "IDNO", "NATI", "NCHI", "NMR", "OCCU", "PROP",
  "RELI", "RESI", "SSN", "TITL", "FACT",
]);

/**
 * The roles a family record names its spouses in. A pointer to a person in any
 * other role — an associate, a witness, a submitter — is not a spouse.
 */
export const SPOUSE_ROLE_TAGS: ReadonlySet<string> = new Set(["HUSB", "WIFE"]);

export const CHILD_ROLE_TAGS: ReadonlySet<string> = new Set(["CHIL"]);

export const CHILD_FAMILY_TAG = "FAMC";
export const SPOUSE_FAMILY_TAG = "FAMS";
