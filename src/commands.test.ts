import { afterEach, describe, expect, it, vi } from "vitest";

import { COMMANDS, type CommandHost, type CommandView } from "./commands";
import type { GedcomRecord } from "./editor/records";
import type { DeskMode } from "./desk/deskState";
import { resetLanguage, setLanguage, t } from "./i18n";

afterEach(resetLanguage);

const RECORD: GedcomRecord = {
  tag: "INDI",
  identifier: "@I1@",
  label: "Marie /Curie/",
  start: { line: 3, character: 0 },
};

function view(overrides: Partial<CommandView> = {}): CommandView {
  return {
    file: { path: "tree.ged" },
    records: () => [RECORD],
    recordAtCursor: () => RECORD,
    canRenameReference: () => true,
    problemCount: () => 0,
    canShowProblems: () => true,
    goToRecord: vi.fn(),
    goToDefinition: vi.fn(() => true),
    goToNextReference: vi.fn(() => 0),
    renameReference: vi.fn(() => true),
    goToNextProblem: vi.fn(() => true),
    goToPreviousProblem: vi.fn(() => true),
    toggleProblemsPanel: vi.fn(),
    showSearch: vi.fn<(replace: boolean) => void>(),
    inSource: () => true,
    mode: () => "source",
    showMode: vi.fn(),
    toggleMode: vi.fn(),
    genealogyInterface: () => true,
    ...overrides,
  };
}

function host(overrides: Partial<CommandHost> = {}) {
  const notify = vi.fn();
  const copy = vi.fn(() => Promise.resolve());
  return {
    notify,
    copy,
    host: {
      vaultName: () => "Family",
      linkToRecord: (path: string, subpath: string, text: string) =>
        `[[${path}${subpath}|${text}]]`,
      notify,
      copy,
      chooseRecord: vi.fn(),
      askForName: vi.fn(),
      ...overrides,
    } satisfies CommandHost,
  };
}

const command = (id: string) => {
  const found = COMMANDS.find((entry) => entry.id === id);
  if (!found) {
    throw new Error(`no command ${id}`);
  }
  return found;
};

describe("the command list", () => {
  it("gives every command an identifier of its own", () => {
    const ids = COMMANDS.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("what a command offers itself for", () => {
  it("offers the switcher only where there is a record to switch to", () => {
    const goTo = command("go-to-gedcom-record");

    expect(goTo.isAvailable(view())).toBe(true);
    expect(goTo.isAvailable(view({ records: () => [] }))).toBe(false);
  });

  it("offers a link only for a saved file with an identified record", () => {
    const copy = command("copy-gedcom-record-link");

    expect(copy.isAvailable(view())).toBe(true);
    expect(copy.isAvailable(view({ file: null }))).toBe(false);
    expect(copy.isAvailable(view({ recordAtCursor: () => undefined }))).toBe(
      false,
    );
    expect(
      copy.isAvailable(
        view({ recordAtCursor: () => ({ ...RECORD, identifier: undefined }) }),
      ),
    ).toBe(false);
  });

  it("offers a rename only where the cursor is on something renameable", () => {
    const rename = command("rename-gedcom-reference");

    expect(rename.isAvailable(view())).toBe(true);
    expect(rename.isAvailable(view({ canRenameReference: () => false }))).toBe(
      false,
    );
  });

  it("offers problem navigation only where there are problems", () => {
    for (const id of [
      "go-to-next-gedcom-problem",
      "go-to-previous-gedcom-problem",
    ]) {
      expect(command(id).isAvailable(view())).toBe(false);
      expect(command(id).isAvailable(view({ problemCount: () => 2 }))).toBe(
        true,
      );
    }
  });

  it("offers the problems panel only where diagnostics are on", () => {
    const toggle = command("toggle-gedcom-problems-panel");

    expect(toggle.isAvailable(view())).toBe(true);
    expect(toggle.isAvailable(view({ canShowProblems: () => false }))).toBe(
      false,
    );
  });

  it("always offers the ones that need nothing of the document", () => {
    for (const id of [
      "go-to-gedcom-definition",
      "find-gedcom-references",
      "search-in-gedcom-file",
      "replace-in-gedcom-file",
    ]) {
      expect(command(id).isAvailable(view({ records: () => [] }))).toBe(true);
    }
  });
});

const FAMILY: GedcomRecord = {
  tag: "FAM",
  identifier: "@F3@",
  label: "Pierre Curie and Marie Skłodowska-Curie",
  start: { line: 40, character: 0 },
};

describe("what a command offers in Graph with a family selected", () => {
  const graph = view({
    inSource: () => false,
    mode: () => "graph",
    recordAtCursor: () => FAMILY,
    problemCount: () => 2,
  });

  it("offers nothing that acts on the editor, and no replace", () => {
    for (const id of [
      "go-to-gedcom-definition",
      "find-gedcom-references",
      "rename-gedcom-reference",
      "go-to-next-gedcom-problem",
      "go-to-previous-gedcom-problem",
      "toggle-gedcom-problems-panel",
      "replace-in-gedcom-file",
    ]) {
      expect(command(id).isAvailable(graph), id).toBe(false);
    }
  });

  it("offers copying a link to the selected family, switching mode and find", () => {
    for (const id of [
      "copy-gedcom-record-wikilink",
      "copy-gedcom-record-link",
      "toggle-gedcom-mode",
      "search-in-gedcom-file",
    ]) {
      expect(command(id).isAvailable(graph), id).toBe(true);
    }
  });

  it("copies the link of the selected family", async () => {
    const { host: commandHost, copy, notify } = host();

    command("copy-gedcom-record-link").run(commandHost, graph);
    await vi.waitFor(() => expect(notify).toHaveBeenCalled());

    expect(copy).toHaveBeenCalledWith("obsidian://domorium?vault=Family&file=tree.ged&xref=%40F3%40");
  });

  it("offers no link with nothing selected", () => {
    expect(command("copy-gedcom-record-link").isAvailable(view({ ...graph, recordAtCursor: () => undefined }))).toBe(false);
  });

  it("does not offer switching mode while the genealogy interface is off", () => {
    expect(
      command("toggle-gedcom-mode").isAvailable(
        view({ genealogyInterface: () => false }),
      ),
    ).toBe(false);
  });

  it("switches the tab's mode", () => {
    const toggleMode = vi.fn();
    command("toggle-gedcom-mode").run(host().host, view({ toggleMode }));

    expect(toggleMode).toHaveBeenCalled();
  });
});

describe("showing the file in a mode", () => {
  const MODES: [DeskMode, string][] = [
    ["graph", "network"],
    ["timeline", "calendar-range"],
    ["list", "list"],
    ["map", "map"],
    ["source", "code"],
  ];

  it("has a command for each mode, with its icon and no key", () => {
    for (const [mode, icon] of MODES) {
      const show = command(`show-gedcom-as-${mode}`);

      expect(show.icon).toBe(icon);
      expect(show.hotkeys).toBeUndefined();
    }
  });

  it("is offered while the genealogy interface is on, for every mode but the one the tab is in", () => {
    for (const [mode] of MODES) {
      for (const [current] of MODES) {
        expect(
          command(`show-gedcom-as-${mode}`).isAvailable(view({ mode: () => current })),
          `${mode} from ${current}`,
        ).toBe(mode !== current);
      }
    }
  });

  it("is not offered while the genealogy interface is off", () => {
    for (const [mode] of MODES) {
      expect(command(`show-gedcom-as-${mode}`).isAvailable(view({ genealogyInterface: () => false, mode: () => "source" }))).toBe(false);
    }
  });

  it("shows the tab in the mode it names", () => {
    for (const [mode] of MODES) {
      const showMode = vi.fn();
      command(`show-gedcom-as-${mode}`).run(host().host, view({ showMode, mode: () => "timeline" }));

      expect(showMode).toHaveBeenCalledWith(mode);
    }
  });

  it("has no command for Genealogy mode", () => {
    const ids = COMMANDS.map((entry) => entry.id);

    expect(ids).not.toContain("show-gedcom-as-genealogy");
  });

  it("opens no overview tab of its own, as the two commands of an earlier version did", () => {
    expect(COMMANDS.map((entry) => entry.id)).not.toContain("open-gedcom-file-timeline");
    expect(COMMANDS.map((entry) => entry.id)).not.toContain("open-gedcom-file-graph");
  });

  it("keeps the toggle out of the tab's menu, where the four modes are", () => {
    expect(command("toggle-gedcom-mode").menu).toBe(false);
    expect(command("show-gedcom-as-graph").menu).toBeUndefined();
  });

  it("is named in the palette, in English and in Russian", () => {
    expect(t(command("show-gedcom-as-timeline").name)).toBe("Show as timeline");
    setLanguage("ru");
    expect(t(command("show-gedcom-as-graph").name)).toBe("Показать как граф");
    expect(t(command("show-gedcom-as-list").name)).toBe("Показать как список");
  });

  it("offers Show as list in every mode but List, and runs showMode with list", () => {
    const list = command("show-gedcom-as-list");
    expect(t(list.name)).toBe("Show as list");
    for (const current of ["graph", "timeline", "source"] as const) {
      expect(list.isAvailable(view({ mode: () => current }))).toBe(true);
    }
    expect(list.isAvailable(view({ mode: () => "list" }))).toBe(false);
    expect(list.isAvailable(view({ genealogyInterface: () => false }))).toBe(false);
    const showMode = vi.fn();
    list.run(host().host, view({ showMode, mode: () => "graph" }));
    expect(showMode).toHaveBeenCalledWith("list");
  });
});

describe("Show as map", () => {
  it("is named in both languages, offered in every mode but Map, and has no key", () => {
    const map = command("show-gedcom-as-map");
    expect(t(map.name)).toBe("Show as map");
    for (const current of ["graph", "timeline", "list", "source"] as const) {
      expect(map.isAvailable(view({ mode: () => current }))).toBe(true);
    }
    expect(map.isAvailable(view({ mode: () => "map" }))).toBe(false);
    expect(map.isAvailable(view({ genealogyInterface: () => false }))).toBe(false);
    expect(map.hotkeys).toBeUndefined();
    setLanguage("ru");
    expect(t(map.name)).toBe("Показать как карту");
  });

  it("offers find, which opens the search, and no replace", () => {
    const inMap = view({ inSource: () => false, mode: () => "map", recordAtCursor: () => FAMILY });
    const showSearch = vi.fn<(replace: boolean) => void>();
    expect(command("search-in-gedcom-file").isAvailable(inMap)).toBe(true);
    command("search-in-gedcom-file").run(host().host, view({ ...inMap, showSearch }));
    expect(showSearch).toHaveBeenCalledWith(false);
    expect(command("replace-in-gedcom-file").isAvailable(inMap)).toBe(false);
  });

  it("goes to Source and back with the toggle", () => {
    const toggleMode = vi.fn();
    command("toggle-gedcom-mode").run(host().host, view({ toggleMode, mode: () => "map" }));

    expect(toggleMode).toHaveBeenCalled();
  });
});

describe("what a command offers in List", () => {
  const list = view({ inSource: () => false, mode: () => "list", recordAtCursor: () => FAMILY, problemCount: () => 2 });

  it("offers find, which focuses the filter, and runs showSearch without replace", () => {
    const showSearch = vi.fn<(replace: boolean) => void>();
    expect(command("search-in-gedcom-file").isAvailable(list)).toBe(true);
    command("search-in-gedcom-file").run(host().host, view({ ...list, showSearch }));
    expect(showSearch).toHaveBeenCalledWith(false);
  });

  it("offers no replace and nothing that acts on the editor", () => {
    for (const id of [
      "replace-in-gedcom-file",
      "go-to-gedcom-definition",
      "rename-gedcom-reference",
      "go-to-next-gedcom-problem",
    ]) {
      expect(command(id).isAvailable(list), id).toBe(false);
    }
  });

  it("offers copying a link with a family selected, and copies @F3@", async () => {
    const { host: commandHost, copy, notify } = host();

    expect(command("copy-gedcom-record-link").isAvailable(list)).toBe(true);
    command("copy-gedcom-record-link").run(commandHost, list);
    await vi.waitFor(() => expect(notify).toHaveBeenCalled());

    expect(copy).toHaveBeenCalledWith("obsidian://domorium?vault=Family&file=tree.ged&xref=%40F3%40");
    expect(command("copy-gedcom-record-link").isAvailable(view({ ...list, recordAtCursor: () => undefined }))).toBe(false);
  });

  it("toggles between the list and Source through the view", () => {
    const toggleMode = vi.fn();
    command("toggle-gedcom-mode").run(host().host, view({ ...list, toggleMode }));

    expect(toggleMode).toHaveBeenCalled();
  });
});

describe("what a command offers in Graph and Timeline", () => {
  const timeline = view({ inSource: () => false, mode: () => "timeline" });

  it("offers find in every mode, and not replace nor anything that acts on the editor", () => {
    for (const mode of ["graph", "timeline", "source"] as const) {
      expect(command("search-in-gedcom-file").isAvailable(view({ mode: () => mode })), mode).toBe(true);
    }
    expect(command("search-in-gedcom-file").isAvailable(timeline)).toBe(true);
    expect(command("replace-in-gedcom-file").isAvailable(timeline)).toBe(false);
    expect(command("rename-gedcom-reference").isAvailable(timeline)).toBe(false);
  });

  it("offers a link to the record selected in a view, and none with nobody selected", () => {
    expect(command("copy-gedcom-record-link").isAvailable(timeline)).toBe(true);
    expect(command("copy-gedcom-record-link").isAvailable(view({ ...timeline, recordAtCursor: () => undefined }))).toBe(false);
  });
});

describe("what a command does when it runs", () => {
  it("copies a link naming the vault, the file and the record", async () => {
    const { host: commandHost, copy, notify } = host();

    command("copy-gedcom-record-link").run(commandHost, view());
    await vi.waitFor(() => expect(notify).toHaveBeenCalled());

    expect(copy).toHaveBeenCalledWith(
      "obsidian://domorium?vault=Family&file=tree.ged&xref=%40I1%40",
    );
    expect(notify).toHaveBeenCalledWith("GEDCOM: link to @I1@ copied");
  });

  it("copies a link the vault indexes, showing the name the record carries", async () => {
    const { host: commandHost, copy, notify } = host();

    command("copy-gedcom-record-wikilink").run(commandHost, view());
    await vi.waitFor(() => expect(notify).toHaveBeenCalled());

    expect(copy).toHaveBeenCalledWith("[[tree.ged#@I1@|Marie /Curie/]]");
  });

  it("says so when the clipboard refuses", async () => {
    const { host: commandHost, notify } = host({
      copy: () => Promise.reject(new Error("denied")),
    });

    command("copy-gedcom-record-link").run(commandHost, view());
    await vi.waitFor(() => expect(notify).toHaveBeenCalled());

    expect(notify).toHaveBeenCalledWith("GEDCOM: the link could not be copied");
  });

  it("moves to the record the switcher chose", () => {
    const chooseRecord = vi.fn(
      (records: GedcomRecord[], chosen: (record: GedcomRecord) => void) => {
        chosen(records[0]);
      },
    );
    const goToRecord = vi.fn();

    command("go-to-gedcom-record").run(
      host({ chooseRecord }).host,
      view({ goToRecord }),
    );

    expect(goToRecord).toHaveBeenCalledWith(RECORD);
  });

  it("says nothing when a rename lands, and says so when it does not", () => {
    const askForName = vi.fn((entered: (name: string) => void) => {
      entered("@I2@");
    });
    const { host: commandHost, notify } = host({ askForName });

    command("rename-gedcom-reference").run(commandHost, view());
    expect(notify).not.toHaveBeenCalled();

    command("rename-gedcom-reference").run(
      commandHost,
      view({ renameReference: () => false }),
    );
    expect(notify).toHaveBeenCalledWith(
      "GEDCOM reference could not be renamed",
    );
  });

  it("reports how many references it found, or that it found none", () => {
    const none = host();
    command("find-gedcom-references").run(none.host, view());
    expect(none.notify).toHaveBeenCalledWith("No GEDCOM references found");

    const some = host();
    command("find-gedcom-references").run(
      some.host,
      view({ goToNextReference: () => 3 }),
    );
    expect(some.notify).toHaveBeenCalledWith(
      "3 GEDCOM references; moved to next",
    );

    const one = host();
    command("find-gedcom-references").run(
      one.host,
      view({ goToNextReference: () => 1 }),
    );
    expect(one.notify).toHaveBeenCalledWith(
      "1 GEDCOM reference; moved to next",
    );
  });

  it("speaks the reader's language, and leaves the identifier in it alone", async () => {
    setLanguage("ru");
    const { host: commandHost, notify } = host();

    command("copy-gedcom-record-link").run(commandHost, view());
    await vi.waitFor(() => expect(notify).toHaveBeenCalled());

    const said = notify.mock.calls[0]?.[0] as string;
    expect(said).toContain("@I1@");
    expect(said).not.toContain("copied");
    expect(said).toMatch(/[а-я]/);
  });
});

describe("what a command is called", () => {
  it("carries a name the palette can show in English", () => {
    expect(t(command("go-to-gedcom-record").name)).toBe("Go to record");
    expect(t(command("replace-in-gedcom-file").name)).toBe("Replace...");
  });

  it("carries the same name in Russian", () => {
    setLanguage("ru");
    expect(t(command("go-to-gedcom-record").name)).toBe("Перейти к записи");
  });

  it("gives every command a name of its own", () => {
    const names = COMMANDS.map((entry) => t(entry.name));
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("what the search commands ask the view for", () => {
  it("opens the bar with the replace row collapsed, and expanded", () => {
    const showSearch = vi.fn<(replace: boolean) => void>();

    command("search-in-gedcom-file").run(host().host, view({ showSearch }));
    expect(showSearch.mock.calls).toEqual([[false]]);

    command("replace-in-gedcom-file").run(host().host, view({ showSearch }));
    expect(showSearch.mock.calls).toEqual([[false], [true]]);
  });
});

describe("the keys a command carries by default", () => {
  it("opens replace on Mod+Alt+F where Obsidian's own does, and Mod+H elsewhere", () => {
    const replace = command("replace-in-gedcom-file");

    expect(replace.hotkeys?.(true)).toEqual([
      { modifiers: ["Mod", "Alt"], key: "F" },
    ]);
    expect(replace.hotkeys?.(false)).toEqual([
      { modifiers: ["Mod"], key: "H" },
    ]);
  });

  it("claims no key for find, which is Obsidian's own to give", () => {
    expect(command("search-in-gedcom-file").hotkeys).toBeUndefined();
  });

  it("leaves every other command without a default", () => {
    const claimed = COMMANDS.filter((entry) => entry.hotkeys).map(
      (entry) => entry.id,
    );

    expect(claimed).toEqual(["replace-in-gedcom-file"]);
  });
});
