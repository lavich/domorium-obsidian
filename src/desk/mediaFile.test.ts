import { describe, expect, it, vi } from "vitest";

import { TextTab } from "../testing/textTab";
import { commit, type WriteOutcome } from "./edits";
import {
  availablePath,
  copyFolder,
  COPY_FAILED,
  fileChoices,
  fileTarget,
  formFor,
  mediaFileEdit,
  safeName,
  vaultFileChoices,
  type FileChoiceHost,
  type FileOutcome,
} from "./mediaFile";

const HEAD = {
  "7.0": ["0 HEAD", "1 GEDC", "2 VERS 7.0"],
  "5.5.1": ["0 HEAD", "1 GEDC", "2 VERS 5.5.1", "2 FORM LINEAGE-LINKED", "1 CHAR UTF-8"],
};
const tabOf = (lines: string[], version: "7.0" | "5.5.1" = "7.0"): TextTab =>
  new TextTab([...HEAD[version], ...lines, "0 TRLR"].join("\n"));
const at = (line: number) => ({ line, character: 0 });
const linesOf = (tab: TextTab): string[] => tab.text.split("\n");

describe("the path a medium's file is written as", () => {
  it("names a file beside or beneath the GEDCOM file from its folder", () => {
    expect(fileTarget("curie.ged", "Media/photo.jpg", "7.0")).toBe("Media/photo.jpg");
    expect(fileTarget("trees/curie.ged", "trees/Media/photo.jpg", "7.0")).toBe("Media/photo.jpg");
  });

  it("escapes a GEDCOM 7 path and leaves a 5.5.1 one as it is", () => {
    expect(fileTarget("curie.ged", "Media/my photo.jpg", "7.0")).toBe("Media/my%20photo.jpg");
    expect(fileTarget("curie.ged", "Media/my photo.jpg", "5.5.1")).toBe("Media/my photo.jpg");
  });

  it("reaches a file above its folder in 5.5.1 and not in 7.0", () => {
    expect(fileTarget("trees/curie.ged", "Media/photo.jpg", "5.5.1")).toBe("../Media/photo.jpg");
    expect(fileTarget("trees/curie.ged", "Media/photo.jpg", "7.0")).toBe("../Media/photo.jpg");
  });
});

describe("where a file from the device is copied", () => {
  it("goes beside the file the line names, where that is in the vault", () => {
    expect(copyFolder("trees/curie.ged", "Pictures/old.jpg")).toBe("Pictures");
    expect(copyFolder("curie.ged", "old.jpg")).toBe("");
  });

  it("goes into Media beside the GEDCOM file otherwise", () => {
    expect(copyFolder("curie.ged", undefined)).toBe("Media");
    expect(copyFolder("trees/curie.ged", undefined)).toBe("trees/Media");
  });

  it("numbers a name that is taken before its extension", () => {
    const taken = new Set(["Media/photo.jpg", "Media/photo 1.jpg"]);

    expect(availablePath("Media", "photo.jpg", (path) => taken.has(path))).toBe("Media/photo 2.jpg");
    expect(availablePath("Media", "scan.png", (path) => taken.has(path))).toBe("Media/scan.png");
    expect(availablePath("", "README", () => false)).toBe("README");
    expect(availablePath("", "README", (path) => path === "README")).toBe("README 1");
  });

  it("replaces what a vault name cannot hold", () => {
    expect(safeName('a/b:c*d?"e<f>g|h\\i.jpg')).toBe("a-b-c-d--e-f-g-h-i.jpg");
    expect(safeName(".jpg")).toBe("file.jpg");
    expect(safeName("  ")).toBe("file");
  });
});

describe("the format of a file", () => {
  it("is a media type in GEDCOM 7, the device's where it gives one", () => {
    expect(formFor("Media/a.JPG", "7.0")).toBe("image/jpeg");
    expect(formFor("Media/a.svg", "7.0")).toBe("image/svg+xml");
    expect(formFor("Media/a.heic", "7.0", "image/heic")).toBe("image/heic");
    expect(formFor("Media/a.bin", "7.0", "")).toBe("application/octet-stream");
    expect(formFor("Media/a.bin", "7.0", "not a type")).toBe("application/octet-stream");
  });

  it("is the extension in 5.5.1, in the standard's spelling", () => {
    expect(formFor("Media/a.JPEG", "5.5.1")).toBe("jpg");
    expect(formFor("Media/a.tiff", "5.5.1", "image/tiff")).toBe("tif");
    expect(formFor("Media/a.png", "5.5.1")).toBe("png");
  });
});

describe("the files of the vault a medium may name", () => {
  it("lists images first, then the rest, with no GEDCOM file, the current one marked", () => {
    expect(vaultFileChoices(["b.mp3", "curie.ged", "z.png", "a.jpg", "Notes/x.md", "old.GEDCOM"], "z.png")).toEqual([
      { path: "a.jpg", checked: false },
      { path: "z.png", checked: true },
      { path: "b.mp3", checked: false },
      { path: "Notes/x.md", checked: false },
    ]);
  });
});

describe("writing a medium's file", () => {
  it("writes the path and the media type of 7.0 as one change", () => {
    const tab = tabOf(["0 @O1@ OBJE", "1 FILE Media/a.svg", "2 FORM image/svg+xml", "2 TITL A"]);

    const outcome = commit(tab, mediaFileEdit(tab.service(), "curie.ged", { file: at(4), form: at(5) }, "Media/b c.png", tab.version));

    expect(outcome.ok).toBe(true);
    expect(linesOf(tab).slice(4, 7)).toEqual(["1 FILE Media/b%20c.png", "2 FORM image/png", "2 TITL A"]);
    expect(tab.writes).toBe(1);
  });

  it("writes the extension of 5.5.1, and the file of a medium a record writes inline", () => {
    const tab = tabOf(["0 @I1@ INDI", "1 OBJE", "2 FILE b.png", "3 FORM bmp", "2 TITL x"], "5.5.1");

    commit(tab, mediaFileEdit(tab.service(), "curie.ged", { file: at(7), form: at(8) }, "Media/c.gif", tab.version));

    expect(linesOf(tab).slice(6, 9)).toEqual(["1 OBJE", "2 FILE Media/c.gif", "3 FORM gif"]);
  });

  it("writes only the path where the line states no format", () => {
    const tab = tabOf(["0 @O1@ OBJE", "1 FILE a.jpg", "2 TITL A"], "5.5.1");

    commit(tab, mediaFileEdit(tab.service(), "curie.ged", { file: at(6) }, "Media/b.png", tab.version));

    expect(linesOf(tab).slice(6, 8)).toEqual(["1 FILE Media/b.png", "2 TITL A"]);
  });

  it("writes a 5.5.1 format the standard does not list as an extension, with the service's warning", () => {
    const tab = tabOf(["0 @O1@ OBJE", "1 FILE a.jpg", "2 FORM jpg"], "5.5.1");

    const outcome = commit(tab, mediaFileEdit(tab.service(), "curie.ged", { file: at(6), form: at(7) }, "Media/b.png", tab.version));

    expect(outcome).toMatchObject({ ok: true });
    expect((outcome as { warnings: string[] }).warnings).toHaveLength(1);
    expect(linesOf(tab).slice(6, 8)).toEqual(["1 FILE Media/b.png", "2 FORM png"]);
  });

  it("writes nothing where 5.5.1 cannot read the format even as an extension", () => {
    const tab = tabOf(["0 @O1@ OBJE", "1 FILE a.jpg", "2 FORM jpg"], "5.5.1");
    const before = tab.text;

    const outcome = commit(tab, mediaFileEdit(tab.service(), "curie.ged", { file: at(6), form: at(7) }, "Media/b.xyz", tab.version));

    expect(outcome).toMatchObject({ ok: false, code: "value-not-in-enum" });
    expect(tab.text).toBe(before);
  });

  it("writes nothing for a file a GEDCOM 7 file cannot name, as the service refuses it", () => {
    const tab = tabOf(["0 @O1@ OBJE", "1 FILE Media/a.jpg", "2 FORM image/jpeg"]);
    const before = tab.text;

    const outcome = commit(tab, mediaFileEdit(tab.service(), "trees/curie.ged", { file: at(4), form: at(5) }, "Media/b.jpg", tab.version));

    expect(outcome).toMatchObject({ ok: false, code: "file-target-unsupported" });
    expect(tab.text).toBe(before);
  });

  it("is refused where the text changed since the card was drawn", () => {
    const tab = tabOf(["0 @O1@ OBJE", "1 FILE Media/a.jpg", "2 FORM image/jpeg"]);
    const drawn = tab.version;
    tab.replace(`${tab.text}\n`);

    expect(mediaFileEdit(tab.service(), "curie.ged", { file: at(4), form: at(5) }, "Media/b.jpg", drawn)).toMatchObject({ ok: false, code: "stale-document" });
  });
});

describe("the menu of a medium's file", () => {
  const wrote: WriteOutcome = { ok: true, line: 4, warnings: [] };
  const file = (name: string, type = "image/png"): File => new File([new Uint8Array([1, 2, 3])], name, { type });
  const settled = (done: (outcome: FileOutcome) => void): Promise<void> =>
    vi.waitFor(() => {
      expect(done).toHaveBeenCalled();
    });
  const hostOf = (overrides: Partial<FileChoiceHost> = {}): FileChoiceHost & { copied: string[] } => {
    const copied: string[] = [];
    return {
      copied,
      documentPath: "curie.ged",
      current: undefined,
      vaultFiles: () => ["Media/a.svg", "curie.ged", "Notes/n.md"],
      taken: (path) => path === "Media/photo.png",
      check: () => null,
      write: vi.fn(() => wrote),
      copy: vi.fn((path: string) => {
        copied.push(path);
        return Promise.resolve();
      }),
      chooseVaultFile: (choices, chosen) => {
        chosen(choices[0]?.path ?? "");
      },
      chooseDeviceFile: (chosen) => {
        chosen(file("photo.png"));
      },
      ...overrides,
    };
  };

  it("offers the vault and the device, in that order, with their icons", () => {
    expect(fileChoices(hostOf(), vi.fn()).map((one) => [one.title, one.icon, one.disabled])).toEqual([
      ["Choose from the vault", "folder-open", false],
      ["Upload from device", "upload", false],
    ]);
  });

  it("writes the file chosen from the vault, and copies nothing", () => {
    const host = hostOf();
    const done = vi.fn<(outcome: FileOutcome) => void>();
    const offered = vi.fn<FileChoiceHost["chooseVaultFile"]>((choices, chosen) => {
      chosen(choices[0]?.path ?? "");
    });
    fileChoices({ ...host, chooseVaultFile: offered }, done)[0]?.choose();

    expect(offered.mock.calls[0]?.[0].map((one) => one.path)).toEqual(["Media/a.svg", "Notes/n.md"]);
    expect(host.write).toHaveBeenCalledWith("Media/a.svg");
    expect(host.copied).toEqual([]);
    expect(done).toHaveBeenCalledWith(wrote);
  });

  it("copies a file from the device under a free name into Media, then writes it with the device's type", async () => {
    const host = hostOf();
    const done = vi.fn<(outcome: FileOutcome) => void>();
    fileChoices(host, done)[1]?.choose();
    await settled(done);

    expect(host.copied).toEqual(["Media/photo 1.png"]);
    expect(host.write).toHaveBeenCalledWith("Media/photo 1.png", "image/png");
    expect(done).toHaveBeenCalledWith(wrote);
  });

  it("copies beside the file the line names, where it is in the vault", async () => {
    const host = hostOf({ current: "Pictures/old.jpg" });
    const done = vi.fn<(outcome: FileOutcome) => void>();
    fileChoices(host, done)[1]?.choose();
    await settled(done);

    expect(host.copied).toEqual(["Pictures/photo.png"]);
  });

  it("copies nothing where the path or the format would be refused", async () => {
    const host = hostOf({ check: () => ({ ok: false, code: "value-not-in-enum", message: "no" }) });
    const done = vi.fn<(outcome: FileOutcome) => void>();
    fileChoices(host, done)[1]?.choose();
    await settled(done);

    expect(host.copied).toEqual([]);
    expect(host.write).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledWith(expect.objectContaining({ ok: false, code: "value-not-in-enum" }));
  });

  it("keeps the copy and names it where the line is refused after the copy", async () => {
    const host = hostOf({ write: () => ({ ok: false, code: "stale-document", message: "changed" }) });
    const done = vi.fn<(outcome: FileOutcome) => void>();
    fileChoices(host, done)[1]?.choose();
    await settled(done);

    expect(host.copied).toEqual(["Media/photo 1.png"]);
    expect(done).toHaveBeenCalledWith({ ok: false, code: "stale-document", message: "changed", copied: "Media/photo 1.png" });
  });

  it("writes nothing where the copy fails", async () => {
    const host = hostOf({ copy: () => Promise.reject(new Error("disk full")) });
    const done = vi.fn<(outcome: FileOutcome) => void>();
    fileChoices(host, done)[1]?.choose();
    await settled(done);

    expect(host.write).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledWith(expect.objectContaining({ ok: false, code: COPY_FAILED }));
  });

  it("does nothing until a file is chosen", () => {
    const host = hostOf({ chooseVaultFile: vi.fn(), chooseDeviceFile: vi.fn() });
    const done = vi.fn();
    for (const choice of fileChoices(host, done)) {
      choice.choose();
    }

    expect(host.write).not.toHaveBeenCalled();
    expect(host.copied).toEqual([]);
    expect(done).not.toHaveBeenCalled();
  });
});
