/**
 * Named rather than inferred, because nothing in the data distinguishes an
 * event: a bare `1 DEAT` has no payload and no children, so it is
 * indistinguishable from `1 SEX M` or `1 FAMC @F1@`. The schema that knows the
 * difference is private to the validator.
 */

export const PERSON_EVENT_TAGS: ReadonlySet<string> = new Set([
  "ADOP", "BAPM", "BARM", "BASM", "BIRT", "BLES", "BURI", "CENS", "CHR",
  "CHRA", "CONF", "CREM", "DEAT", "EMIG", "FCOM", "GRAD", "IMMI", "NATU",
  "ORDN", "PROB", "RETI", "WILL", "EVEN",
  "BAPL", "CONL", "ENDL", "SLGC",
  "CAST", "DSCR", "EDUC", "IDNO", "NATI", "NCHI", "NMR", "OCCU", "PROP",
  "RELI", "RESI", "SSN", "TITL", "FACT",
]);

/** A pointer in any other role — an associate, a witness — is not a spouse. */
export const SPOUSE_ROLE_TAGS: ReadonlySet<string> = new Set(["HUSB", "WIFE"]);

export const CHILD_ROLE_TAGS: ReadonlySet<string> = new Set(["CHIL"]);

export const CHILD_FAMILY_TAG = "FAMC";
export const SPOUSE_FAMILY_TAG = "FAMS";
