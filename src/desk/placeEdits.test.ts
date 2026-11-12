import { history, undo } from "@codemirror/commands";
import { EditorState, type TransactionSpec } from "@codemirror/state";
import { applyWorkspaceEdit } from "@domorium/codemirror";
import { afterEach, describe, expect, it } from "vitest";

import { buildIndex } from "../genealogy";
import { resetLanguage, setLanguage } from "../i18n";
import { CURIE } from "../testing/curie";
import { TextTab } from "../testing/textTab";
import { commit, refusalText, type Refusal } from "./edits";
import { NAME_EMPTY, placeLines, planRename, renameEdit, renameQuestion, type Rename } from "./placeEdits";
import { placesOf } from "./placeRows";

afterEach(resetLanguage);

const WARSAW = "warsaw, congress poland";
const indexOfTab = (tab: TextTab) => buildIndex(tab.service());
const placLines = (text: string): string[] => text.split("\n").filter((line) => / PLAC( |$)/u.test(line));

function rename(tab: TextTab, key: string, typed: string): Rename {
  const plan = planRename(indexOfTab(tab), key, typed);
  if (plan === null || "ok" in plan) {
    throw new Error(`no rename for ${typed}`);
  }
  return plan;
}

const file = (version: "7.0" | "5.5.1", lines: string[]): TextTab =>
  new TextTab(
    [
      ...(version === "7.0" ? ["0 HEAD", "1 GEDC", "2 VERS 7.0"] : ["0 HEAD", "1 GEDC", "2 VERS 5.5.1", "2 FORM LINEAGE-LINKED", "1 CHAR UTF-8"]),
      ...lines,
      "0 TRLR",
    ].join("\n"),
  );

describe("the lines of a place", () => {
  it("are the eleven PLAC lines of Warsaw in curie.ged, in the order of the file, Marie's birth first", () => {
    const tab = new TextTab(CURIE);
    const lines = placeLines(indexOfTab(tab), WARSAW);
    const all = tab.text.split("\n");

    expect(lines).toHaveLength(11);
    expect(lines[0]).toMatchObject({ record: "@I1@", event: { tag: "BIRT", date: { text: "7 NOV 1867" } } });
    expect(lines.map(({ at }) => all[at.line])).toEqual(Array<string>(11).fill("2 PLAC Warsaw, Congress Poland"));
    expect(lines.map(({ at }) => at.line)).toEqual([...lines.map(({ at }) => at.line)].sort((a, b) => a - b));
  });

  it("group every spelling of the place, and no PLAC outside the events of people and families", () => {
    const tab = file("7.0", [
      "0 @I1@ INDI",
      "1 BIRT",
      "2 DATE 1900",
      "2 PLAC Kyiv",
      "1 DEAT",
      "2 PLAC  KYIV ",
      "0 @S1@ SOUR",
      "1 DATA",
      "2 EVEN BIRT",
      "3 PLAC Kyiv",
    ]);

    expect(placeLines(indexOfTab(tab), "kyiv").map(({ text }) => text)).toEqual(["Kyiv", " KYIV "]);
  });
});

describe("what a typed name asks for", () => {
  it("refuses an empty name and asks nothing where no line would change", () => {
    const index = indexOfTab(new TextTab(CURIE));

    expect(planRename(index, WARSAW, "   ")).toMatchObject({ ok: false, code: NAME_EMPTY });
    expect(planRename(index, WARSAW, " Warsaw, Congress Poland ")).toBeNull();
  });

  it("leaves out a line that already reads the name, and trims the name", () => {
    const tab = file("7.0", ["0 @I1@ INDI", "1 BIRT", "2 PLAC Kyiv", "1 DEAT", "2 PLAC kyiv"]);

    expect(rename(tab, "kyiv", " Kyiv ")).toEqual({ value: "Kyiv", lines: [{ line: 7, character: 0 }] });
  });

  it("names the place it joins, where the new name is another place's", () => {
    const tab = new TextTab(CURIE);

    expect(rename(tab, "sceaux, france", "paris, france")).toMatchObject({ value: "paris, france", joins: "Paris, France" });
    expect(rename(tab, WARSAW, "WARSAW, Congress Poland").joins).toBeUndefined();
  });

  it("asks in the plural of the reader's language", () => {
    const tab = new TextTab(CURIE);

    expect(renameQuestion(rename(tab, WARSAW, "Warszawa, Poland"))).toBe("Rename the place in 11 lines?");
    expect(renameQuestion(rename(tab, "sceaux, france", "paris, france"))).toBe(
      "Rename the place in 2 lines? It will be merged with “Paris, France”.",
    );
    setLanguage("ru");
    expect(renameQuestion(rename(tab, WARSAW, "Warszawa, Poland"))).toBe("Переименовать место в 11 строках?");
    expect(renameQuestion(rename(tab, "passy, haute-savoie, france", "Paris, France"))).toBe(
      "Переименовать место в 1 строке? Оно объединится с местом «Paris, France».",
    );
  });
});

describe("renaming a place", () => {
  it("writes the new name to every line of Warsaw in curie.ged, in one write", () => {
    const tab = new TextTab(CURIE);

    const outcome = commit(tab, renameEdit(tab.service(), rename(tab, WARSAW, "Warszawa, Poland"), tab.version));

    expect(outcome.ok).toBe(true);
    expect(tab.writes).toBe(1);
    expect(placLines(tab.text).filter((line) => line === "2 PLAC Warszawa, Poland")).toHaveLength(11);
    expect(tab.text).not.toContain("Congress Poland");
    const places = placesOf(indexOfTab(tab));
    expect(places).toHaveLength(8);
    expect(places.find((row) => row.name === "Warszawa, Poland")?.events).toBe(11);
  });

  it("joins Sceaux to Paris", () => {
    const tab = new TextTab(CURIE);

    commit(tab, renameEdit(tab.service(), rename(tab, "sceaux, france", "paris, france"), tab.version));

    const places = placesOf(indexOfTab(tab));
    expect(places).toHaveLength(7);
    expect(places.find((row) => row.key === "paris, france")).toMatchObject({ name: "Paris, France", events: 11 });
    expect(placLines(tab.text).filter((line) => line === "2 PLAC paris, france")).toHaveLength(2);
  });

  it("writes nothing where the service refuses a line, and says why", () => {
    const tab = new TextTab(CURIE);
    const before = tab.text;

    const answer = renameEdit(tab.service(), rename(tab, WARSAW, "Warszawa\nPoland"), tab.version);
    const outcome = commit(tab, answer);

    expect(outcome).toMatchObject({ ok: false, code: "value-spans-lines" });
    expect(tab.text).toBe(before);
    expect(tab.writes).toBe(0);
    expect(refusalText(answer as Refusal)).toBe("A line break is not allowed in this value: it keeps to one line.");
  });

  it("is refused as stale where the text changed since the card was drawn", () => {
    const tab = new TextTab(CURIE);
    const planned = rename(tab, WARSAW, "Warszawa, Poland");
    const drawnAt = tab.version;
    tab.replace(`${tab.text}\n`);

    expect(commit(tab, renameEdit(tab.service(), planned, drawnAt))).toMatchObject({ ok: false, code: "stale-document" });
  });

  it("is undone by one undo", () => {
    let state = EditorState.create({ doc: CURIE, extensions: [history()] });
    const view = {
      get state() {
        return state;
      },
      dispatch: (spec: TransactionSpec) => {
        state = state.update(spec).state;
      },
    };
    const tab = new TextTab(CURIE);
    const answer = renameEdit(tab.service(), rename(tab, WARSAW, "Warszawa, Poland"), tab.version);
    if (!answer.ok) {
      throw new Error(answer.code);
    }

    expect(applyWorkspaceEdit(view, answer.edit, tab.version)).toBe(true);
    expect(state.doc.toString()).not.toContain("Congress Poland");
    undo({ state, dispatch: view.dispatch });

    expect(state.doc.toString()).toBe(CURIE);
  });

  it("writes exactly the name over every spelling in a 5.5.1 file", () => {
    const tab = file("5.5.1", ["0 @I1@ INDI", "1 NAME A /B/", "1 BIRT", "2 PLAC Kyiv", "1 DEAT", "2 PLAC KYIV"]);
    const planned = rename(tab, "kyiv", "Київ");

    commit(tab, renameEdit(tab.service(), planned, tab.version));

    expect(renameQuestion(planned)).toBe("Rename the place in 2 lines?");
    expect(placLines(tab.text)).toEqual(["2 PLAC Київ", "2 PLAC Київ"]);
  });

  it("writes exactly the name over every spelling in a 7.0 file", () => {
    const tab = file("7.0", [
      "0 @I1@ INDI",
      "1 BIRT",
      "2 PLAC Paris, France",
      "1 DEAT",
      "2 PLAC paris,  France",
      "1 FAMS @F1@",
      "0 @F1@ FAM",
      "1 HUSB @I1@",
      "1 MARR",
      "2 PLAC Paris, France",
    ]);
    const planned = rename(tab, "paris, france", "Paris, FRANCE");

    commit(tab, renameEdit(tab.service(), planned, tab.version));

    expect(renameQuestion(planned)).toBe("Rename the place in 3 lines?");
    expect(placLines(tab.text)).toEqual(["2 PLAC Paris, FRANCE", "2 PLAC Paris, FRANCE", "2 PLAC Paris, FRANCE"]);
  });
});
