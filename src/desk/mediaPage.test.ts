// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { curieIndex } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import type { MediaHost, MediaItem } from "./media";
import { renderMediaPage } from "./mediaPage";
import type { PageHost } from "./personPage";

let container: HTMLElement;
let host: ReturnType<typeof deskHost>;

function deskHost() {
  return {
    openRecord: vi.fn<PageHost["openRecord"]>(),
    select: vi.fn<PageHost["select"]>(),
    showInSource: vi.fn<PageHost["showInSource"]>(),
    openEvidence: vi.fn<PageHost["openEvidence"]>(),
    openFile: vi.fn<PageHost["openFile"]>(),
  } satisfies PageHost & MediaHost;
}

beforeAll(installObsidianDom);
beforeEach(() => {
  container = document.createElement("div");
  host = deskHost();
});

const at = { line: 0, character: 0 };
const picture = (crop?: { top: number; left: number; height: number; width: number }): MediaItem => ({
  content: { kind: "image", url: "app://family.svg", name: "curie-family-1908.svg", ...(crop ? { crop } : {}) },
  path: "Media/curie-family-1908.svg",
  at,
});

const texts = (selector: string): string[] =>
  [...container.querySelectorAll(selector)].map((node) => node.textContent ?? "");

describe("the media page", () => {
  const index = curieIndex();
  const photo = index.media("@O5@");
  if (!photo) {
    throw new Error("no @O5@");
  }

  it("shows the photograph whole, with its caption and file", () => {
    renderMediaPage(container, photo, { whole: picture(), links: [] }, index, host);

    expect(texts(".gedcom-desk-title")).toEqual(["The Curie family, about 1908"]);
    expect(texts(".gedcom-desk-subtitle")).toEqual(["Media/curie-family-1908.svg"]);
    expect(container.querySelector(".gedcom-desk-media-stage .is-cropped")).toBeNull();
  });

  it("lists everyone who links it, each with their own part and caption", () => {
    renderMediaPage(container, photo, {
      whole: picture(),
      links: [
        picture({ top: 40, left: 30, height: 240, width: 130 }),
        picture({ top: 40, left: 175, height: 240, width: 130 }),
      ],
    }, index, host);

    expect(texts(".gedcom-desk-user .gedcom-desk-person-name")).toEqual([
      "Marie Skłodowska-Curie", "Pierre Curie",
    ]);
    expect(texts(".gedcom-desk-user-caption")).toEqual([
      "Marie, on the left", "Pierre, in the middle",
    ]);
    expect(container.querySelectorAll(".gedcom-desk-user .is-cropped")).toHaveLength(2);
  });

  it("opens a user's page, and the file itself", () => {
    renderMediaPage(container, photo, { whole: picture(), links: [] }, index, host);
    container.querySelector<HTMLElement>(".gedcom-desk-user .gedcom-desk-person")?.click();
    container.querySelector<HTMLElement>(".gedcom-desk-media-stage")?.click();

    expect(host.openRecord).toHaveBeenCalledWith("@I1@");
    expect(host.openFile).toHaveBeenCalledWith("Media/curie-family-1908.svg");
  });

  it("says when no record links it", () => {
    const lonely = index.media("@O7@");
    if (lonely) {
      renderMediaPage(container, lonely, {
        whole: { content: { kind: "missing", target: "Media/lost-daguerreotype.jpg" }, at },
        links: [],
      }, index, host);
    }

    expect(texts(".gedcom-desk-tile-note")).toEqual(["Not in the vault"]);
    expect(texts(".gedcom-desk-used-by .gedcom-desk-none")).toEqual(["No record links it."]);
  });
});
