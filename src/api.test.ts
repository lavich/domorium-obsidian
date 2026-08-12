import { describe, expect, it, vi } from "vitest";

import { API_VERSION, createGedcomApi, type VaultFile } from "./api";

const TREE = "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @I1@ INDI\n1 NAME Marie\n0 TRLR\n";

function vault(files: Record<string, VaultFile>) {
  const read = vi.fn((path: string) => Promise.resolve(files[path] ?? null));
  return { reader: { read }, read };
}

describe("what a note can ask the plugin", () => {
  it("says which API it is, so a consumer can tell", () => {
    expect(createGedcomApi(vault({}).reader).version).toBe(API_VERSION);
  });

  it("parses text that is already in hand", () => {
    const document = createGedcomApi(vault({}).reader).parse(TREE);

    expect(document.getVersion()).toBe("7.0");
    expect(document.getNodes()).toHaveLength(3);
  });

  it("parses a fragment without asking it for a header", () => {
    const api = createGedcomApi(vault({}).reader);

    expect(
      api.parse("0 @I1@ INDI\n1 NAME Marie", {
        fragment: true,
        dialect: "7.0",
      }).getErrors(),
    ).toEqual([]);
  });

  it("reads a file the vault holds, open or not", async () => {
    const api = createGedcomApi(
      vault({ "tree.ged": { text: TREE, revision: "1" } }).reader,
    );

    expect((await api.read("tree.ged")).getVersion()).toBe("7.0");
  });

  it("names the path rather than answering with nothing", async () => {
    const api = createGedcomApi(vault({}).reader);

    await expect(api.read("missing.ged")).rejects.toThrow("missing.ged");
  });

  it("parses once for a file that has not changed", async () => {
    const { reader, read } = vault({
      "tree.ged": { text: TREE, revision: "1" },
    });
    const api = createGedcomApi(reader);

    const first = await api.read("tree.ged");

    expect(await api.read("tree.ged")).toBe(first);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("parses again once the file has moved on", async () => {
    const files = { "tree.ged": { text: TREE, revision: "1" } };
    const api = createGedcomApi(vault(files).reader);
    const first = await api.read("tree.ged");

    files["tree.ged"] = { text: TREE.replace("Marie", "Pierre"), revision: "2" };

    const second = await api.read("tree.ged");
    expect(second).not.toBe(first);
    expect(second.getNodes()[1].children[0].tokens.VALUE?.value).toBe("Pierre");
  });
});
