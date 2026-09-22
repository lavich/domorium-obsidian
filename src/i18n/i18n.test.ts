import { evaluateSentenceCase } from "eslint-plugin-obsidianmd/dist/lib/rules/ui/sentenceCaseUtil.js";
import { afterEach, describe, expect, it } from "vitest";

import {
  CATALOGUES,
  currentLanguage,
  en,
  named,
  type Message,
  type MessageKey,
  plural,
  resetLanguage,
  setLanguage,
  t,
} from "./index";

const ru = CATALOGUES.ru;

afterEach(resetLanguage);

/** The `{name}` holes in a message, whichever form it takes. */
function placeholdersOf(message: Message): string[] {
  const forms: (string | undefined)[] =
    typeof message === "string"
      ? [message]
      : [
          message.zero,
          message.one,
          message.two,
          message.few,
          message.many,
          message.other,
        ];
  const found = new Set<string>();
  for (const form of forms) {
    for (const match of form?.matchAll(/\{(\w+)\}/g) ?? []) {
      found.add(match[1] ?? "");
    }
  }
  return [...found].sort();
}

describe("which language the plugin speaks", () => {
  it("is English until told otherwise", () => {
    expect(currentLanguage()).toBe("en");
    expect(t("status.noProblems")).toBe("no problems");
  });

  it("speaks Russian for ru and for a regional variant of it", () => {
    setLanguage("ru");
    expect(currentLanguage()).toBe("ru");
    setLanguage("ru-RU");
    expect(currentLanguage()).toBe("ru");
    expect(t("status.noProblems")).toBe(ru["status.noProblems"]);
  });

  it("falls back to English for a language it does not carry", () => {
    setLanguage("de");
    expect(currentLanguage()).toBe("en");
    setLanguage("zh-TW");
    expect(currentLanguage()).toBe("en");
  });

  it("shows the English text where a Russian entry is missing at runtime", () => {
    const key: MessageKey = "media.fileNotFound";
    const kept = CATALOGUES.ru[key];
    delete (CATALOGUES.ru as Partial<Record<MessageKey, Message>>)[key];
    try {
      setLanguage("ru");
      expect(t(key)).toBe(en[key]);
    } finally {
      CATALOGUES.ru[key] = kept;
    }
  });
});

describe("filling a message", () => {
  it("puts each parameter into its hole", () => {
    expect(t("notice.linkCopied", { identifier: "@I1@" })).toBe(
      "GEDCOM: link to @I1@ copied",
    );
    expect(t("note.problemLine", { line: 3, message: "Missing required tag" })).toBe(
      "Line 3: Missing required tag",
    );
  });

  it("leaves an identifier alone in Russian", () => {
    setLanguage("ru");
    expect(t("notice.linkCopied", { identifier: "@I1@" })).toContain("@I1@");
    expect(t("notice.linkCopied", { identifier: "@I1@" })).not.toContain(
      "link",
    );
  });

  // Half of this line is the plugin's and half is the language service's, which
  // writes in English whatever the reader's language.
  it("opens a note's problem line in Russian and passes the message through", () => {
    setLanguage("ru");
    expect(
      t("note.problemLine", { line: 3, message: "Missing required tag" }),
    ).toBe("Строка 3: Missing required tag");
  });
});

describe("spelling a count", () => {
  it("picks one and other in English", () => {
    expect(plural("status.problems", 1)).toBe("1 problem");
    expect(plural("status.problems", 2)).toBe("2 problems");
    expect(plural("status.problems", 21)).toBe("21 problems");
  });

  it("picks singular, paucal and plural in Russian", () => {
    setLanguage("ru");
    expect(plural("status.problems", 1)).toBe("1 проблема");
    expect(plural("status.problems", 2)).toBe("2 проблемы");
    expect(plural("status.problems", 5)).toBe("5 проблем");
    expect(plural("status.problems", 21)).toBe("21 проблема");
  });

  it("carries the other parameters through", () => {
    expect(
      plural("notice.references", 3),
    ).toBe("3 GEDCOM references; moved to next");
  });
});

describe("the two sides of the catalogue", () => {
  it("name the same placeholders for every key", () => {
    for (const key of Object.keys(en) as MessageKey[]) {
      expect(placeholdersOf(ru[key]), key).toEqual(placeholdersOf(en[key]));
    }
  });

  it("carry the same keys, each the same kind of message", () => {
    expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as MessageKey[]) {
      expect(typeof ru[key], key).toBe(typeof en[key]);
    }
  });

  /*
   * `obsidianmd/ui/sentence-case` holds the source files to this standard, but
   * it reads literals passed to Obsidian's own methods, and the English text is
   * no longer written there. Its sibling for locale files listens for AST nodes
   * no JSON parser produces, so the evaluator behind both is called here
   * instead, with the options eslint.config.mjs gives the source files.
   */
  it("spell the English side in sentence case", () => {
    const options = {
      acronyms: ["GEDCOM", "URL"],
      brands: ["Obsidian", "Domorium"],
      // A GEDCOM tag, and two modifier keys.
      ignoreWords: ["FILE", "Ctrl", "Cmd"],
      // A status-bar fragment, and three phrases CodeMirror looks up as it
      // spells them.
      ignoreRegex: ["^no problems$", "^close$", "^folded code$", "^unfold$"],
      enforceCamelCaseLower: true,
    };
    for (const [key, message] of Object.entries(en)) {
      for (const text of typeof message === "string"
        ? [message]
        : Object.values(message)) {
        expect(evaluateSentenceCase(text, options).suggestion ?? text, key).toBe(
          text,
        );
      }
    }
  });

  it("name fewer event tags than the model reads, which is deliberate", () => {
    // The page shows an unnamed tag as the tag, so the catalogue need not
    // chase every structure GEDCOM defines. This asserts the gap exists,
    // because a scenario in person-view depends on it.
    const named = Object.keys(en).filter((key) => key.startsWith("event."));

    expect(named.length).toBeGreaterThan(20);
    expect(named).not.toContain("event.BASM");
  });

  it("give every Russian plural table the forms Russian has", () => {
    for (const [key, message] of Object.entries(ru)) {
      if (typeof message === "string") {
        continue;
      }
      expect(Object.keys(message).sort(), key).toEqual([
        "few",
        "many",
        "one",
        "other",
      ]);
    }
  });
});

describe("a key that is only known at runtime", () => {
  it("answers where the catalogue carries it", () => {
    expect(named("event.BIRT")).toBe("Birth");
    setLanguage("ru");
    expect(named("event.BIRT")).toBe("Рождение");
  });

  it("answers with nothing where it does not, rather than failing", () => {
    expect(named("event.BASM")).toBeUndefined();
    expect(named("nothing.at.all")).toBeUndefined();
  });

  it("fills a hole the way t does", () => {
    expect(named("person.unresolved", { xref: "@I99@" })).toBe(
      "Not in this file: @I99@",
    );
  });
});
