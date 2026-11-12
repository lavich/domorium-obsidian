import { evaluateSentenceCase } from "eslint-plugin-obsidianmd/dist/lib/rules/ui/sentenceCaseUtil.js";
import { afterEach, describe, expect, it } from "vitest";

import { refusalText } from "../desk/edits";
import {
  CATALOGUES,
  currentLanguage,
  en,
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

  it("names a grip and a move, and why a move was refused, in English and in Russian", () => {
    const keys = ["tree.moveField", "tree.moved", "edit.refusal.reading-changed", "edit.refusal.not-a-sibling"] as const;
    for (const key of keys) {
      expect(placeholdersOf(ru[key] ?? "")).toEqual(placeholdersOf(en[key]));
    }
    const refused = (code: string): string => refusalText({ code, message: "service" });
    expect(t("tree.moveField", { field: "Birth" })).toBe("Drag to move Birth");
    expect(t("tree.moved", { field: "Sex", place: 2, count: 14 })).toBe("Sex moved to place 2 of 14");
    expect([refused("reading-changed"), refused("not-a-sibling")]).toEqual([en["edit.refusal.reading-changed"], en["edit.refusal.not-a-sibling"]]);

    setLanguage("ru");
    expect(t("tree.moveField", { field: "Рождение" })).toBe("Перетащите, чтобы переместить «Рождение»");
    expect([refused("reading-changed"), refused("not-a-sibling")]).toEqual([ru["edit.refusal.reading-changed"], ru["edit.refusal.not-a-sibling"]]);
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

  it("spells the count line of the list in both languages", () => {
    expect([1, 2].map((count) => plural("list.count.people", count))).toEqual(["1 person", "2 people"]);
    expect(plural("list.countOf.people", 17, { shown: 11 })).toBe("11 of 17 people");
    expect(plural("list.countOf.sources", 1, { shown: 1 })).toBe("1 of 1 source");
    setLanguage("ru");
    expect([1, 2, 5, 21].map((count) => plural("list.count.people", count))).toEqual([
      "1 человек",
      "2 человека",
      "5 человек",
      "21 человек",
    ]);
    expect(plural("list.countOf.people", 17, { shown: 11 })).toBe("11 из 17 человек");
    expect(plural("list.countOf.families", 21, { shown: 2 })).toBe("2 из 21 семьи");
  });

  it("spells the count lines of the media, notes, repositories and other records in both languages", () => {
    expect(plural("list.count.media", 7)).toBe("7 media");
    expect(plural("list.count.notes", 1478)).toBe("1478 notes");
    expect(plural("list.countOf.notes", 2, { shown: 1 })).toBe("1 of 2 notes");
    expect(plural("list.count.repositories", 2)).toBe("2 repositories");
    expect(plural("list.count.other", 2)).toBe("2 records");
    expect(t("list.compact.linkedFrom", { count: 2 })).toBe("Linked from 2");
    setLanguage("ru");
    expect([1, 2, 5, 21].map((count) => plural("list.count.notes", count))).toEqual(["1 заметка", "2 заметки", "5 заметок", "21 заметка"]);
    expect([1, 3, 7].map((count) => plural("list.count.media", count))).toEqual(["1 медиафайл", "3 медиафайла", "7 медиафайлов"]);
    expect(plural("list.count.repositories", 5)).toBe("5 хранилищ");
    expect(plural("list.countOf.other", 2, { shown: 1 })).toBe("1 из 2 записей");
  });

  it("names the two ways to another file of a medium, and where a copy was left, in both languages", () => {
    expect([t("media.fromVault"), t("media.fromDevice"), t("media.change", { file: "a.jpg" })]).toEqual(["Choose from the vault", "Upload from device", "Change the file a.jpg"]);
    expect(t("media.copyKept", { reason: "The file changed.", path: "Media/a.jpg" })).toBe("The file changed. The copy of the file stays in the vault at Media/a.jpg.");
    setLanguage("ru");
    expect([t("media.fromVault"), t("media.fromDevice"), t("record.tag.COPR")]).toEqual(["Выбрать в хранилище", "Загрузить с устройства", "Авторские права"]);
    expect(t("edit.refusal.file-target-unsupported")).toContain("GEDCOM");
  });

  it("carries the other parameters through", () => {
    expect(
      plural("notice.references", 3),
    ).toBe("3 GEDCOM references; moved to next");
  });
});

describe("the two sides of the catalogue", () => {
  it("give every plural key of the list the forms its language needs", () => {
    for (const key of Object.keys(en).filter((name) => name.startsWith("list.")) as MessageKey[]) {
      const english = en[key];
      if (typeof english === "string") {
        continue;
      }
      expect(Object.keys(english).sort(), key).toEqual(["one", "other"]);
      expect(Object.keys(ru[key] as object).sort(), key).toEqual(["few", "many", "one", "other"]);
    }
  });

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
      acronyms: ["GEDCOM", "LDS", "URL"],
      brands: ["Domorium", "Obsidian"],
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
