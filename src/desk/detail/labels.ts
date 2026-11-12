import { en, t, type MessageKey } from "../../i18n";

const known = (key: string): key is MessageKey => key in en;

/** Words the standard lets a file write for a role that it also names in capitals. */
const ROLE_ALIASES: Record<string, string> = {
  witness: "witn",
  godparent: "godp",
  father: "fath",
  mother: "moth",
  neighbour: "nghbr",
  neighbor: "nghbr",
  spouse: "spou",
  husband: "husb",
  child: "chil",
};

function named(prefix: string, word: string, aliases: Record<string, string> = {}): string | undefined {
  const lower = word.trim().toLowerCase();
  const key = `${prefix}.${aliases[lower] ?? lower}`;
  return known(key) ? t(key) : undefined;
}

/** A tag the standard names, in the reader's language; any other tag, a custom one included, as written. */
export function tagLabel(tag: string): string {
  const own = `record.tag.${tag}`;
  if (known(own)) {
    return t(own);
  }
  const event = `event.${tag}`;
  return known(event) ? t(event) : tag;
}

export const nameTypeLabel = (type: string): string => named("record.nameType", type) ?? type;
export const roleLabel = (role: string): string => named("record.role", role, ROLE_ALIASES) ?? role;
export const linkStatusLabel = (status: string): string => named("record.linkStatus", status) ?? status;

export function sexLabel(sex: string): string {
  const key = `record.sex.${sex.trim().toUpperCase()}`;
  return known(key) ? t(key) : sex;
}
