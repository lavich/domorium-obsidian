import { describe, expect, it, vi } from "vitest";

import { COMMANDS, type CommandHost, type CommandView } from "./commands";
import type { GedcomRecord } from "./editor/records";

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
    openSearch: vi.fn<(replace: boolean) => void>(),
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
      "3 GEDCOM reference(s); moved to next",
    );
  });
});
