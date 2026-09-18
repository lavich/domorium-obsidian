import en from "./en.json";
import ruJson from "./ru.json";

export interface PluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/** A string with `{name}` holes, or plural forms as `Intl.PluralRules` names them. */
export type Message = string | PluralForms;

/** `en.json` is the key set; `ru.json` must carry every key or fail the build. */
export type MessageKey = keyof typeof en;

export type Language = "en" | "ru";

const ru: Record<MessageKey, Message> = ruJson;

export const CATALOGUES: Record<Language, Record<MessageKey, Message>> = {
  en,
  ru,
};

export { en };

/**
 * One value for the whole plugin, set once on load, so it is module state
 * rather than a parameter of every host interface. Nothing here imports
 * `obsidian`: the harness and the tests set the language themselves.
 */
let language: Language = "en";
let rules = new Intl.PluralRules(language);

/** Takes what `getLanguage()` returns; only the primary subtag decides. */
export function setLanguage(code: string): void {
  const primary = code.split(/[-_]/)[0]?.toLowerCase();
  language = primary === "ru" ? "ru" : "en";
  rules = new Intl.PluralRules(language);
}

export function currentLanguage(): Language {
  return language;
}

export function resetLanguage(): void {
  setLanguage("en");
}

export type Params = Record<string, string | number>;

function messageFor(key: MessageKey): Message {
  return CATALOGUES[language][key] ?? en[key];
}

function fill(text: string, params: Params | undefined): string {
  if (!params) {
    return text;
  }
  return text.replace(/\{(\w+)\}/g, (hole, name: string) =>
    name in params ? String(params[name]) : hole,
  );
}

export function t(key: MessageKey, params?: Params): string {
  const message = messageFor(key);
  const text = typeof message === "string" ? message : message.other;
  return fill(text, params);
}

/** `{count}` is filled from `count`, chosen by the language's plural rules. */
export function plural(key: MessageKey, count: number, params?: Params): string {
  const message = messageFor(key);
  const text =
    typeof message === "string"
      ? message
      : (message[rules.select(count)] ?? message.other);
  return fill(text, { ...params, count });
}
