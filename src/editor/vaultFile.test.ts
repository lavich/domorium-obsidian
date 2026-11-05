import { describe, expect, it } from "vitest";

import { openVaultFile, type VaultFileHost } from "./vaultFile";

function host(overrides: Partial<VaultFileHost<string, string>> = {}) {
  const calls: string[] = [];
  const base: VaultFileHost<string, string> = {
    normalize: (path) => path.replace(/^\.\//, ""),
    find: (path) => path,
    leafShowing: () => null,
    reveal: (leaf) => calls.push(`reveal ${leaf}`),
    openInTab: (file) => calls.push(`open ${file}`),
    notFound: (path) => calls.push(`missing ${path}`),
  };
  return { calls, host: { ...base, ...overrides } };
}

describe("opening a vault file", () => {
  it("opens the file in a tab of its own when no tab shows it", () => {
    const { calls, host: h } = host();
    openVaultFile("./media/a.jpg", h);
    expect(calls).toEqual(["open media/a.jpg"]);
  });

  it("reveals the tab that already shows the file", () => {
    const { calls, host: h } = host({ leafShowing: () => "leaf-1" });
    openVaultFile("a.jpg", h);
    expect(calls).toEqual(["reveal leaf-1"]);
  });

  it("reports a file the vault does not hold, by its normalized path", () => {
    const { calls, host: h } = host({ find: () => null });
    openVaultFile("./gone.jpg", h);
    expect(calls).toEqual(["missing gone.jpg"]);
  });
});
