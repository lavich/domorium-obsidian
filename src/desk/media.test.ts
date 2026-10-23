// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { installObsidianDom } from "../testing/obsidianDom";
import { renderGallery, renderPortrait, type MediaHost, type MediaItem } from "./media";

let container: HTMLElement;
let host: ReturnType<typeof mediaHost>;

function mediaHost() {
  return {
    openFile: vi.fn<MediaHost["openFile"]>(),
    openRecord: vi.fn<MediaHost["openRecord"]>(),
    showInSource: vi.fn<MediaHost["showInSource"]>(),
  } satisfies MediaHost;
}

beforeAll(installObsidianDom);
beforeEach(() => {
  container = document.createElement("div");
  host = mediaHost();
});

const at = { line: 30, character: 7 };

const MARIE: MediaItem[] = [
  {
    content: { kind: "image", url: "app://marie.svg", name: "marie-sklodowska-curie.svg", title: "Marie Skłodowska-Curie" },
    path: "Media/marie-sklodowska-curie.svg",
    record: "@O1@",
    at,
  },
  {
    content: {
      kind: "image",
      url: "app://family.svg",
      name: "curie-family-1908.svg",
      title: "Marie, on the left",
      crop: { top: 40, left: 30, height: 240, width: 130 },
    },
    path: "Media/curie-family-1908.svg",
    record: "@O5@",
    at,
  },
  {
    content: { kind: "remote", url: "https://upload.wikimedia.org/marie.jpg", state: "unasked", title: "A portrait" },
    record: "@O6@",
    at,
  },
  {
    content: { kind: "missing", target: "Media/lost.jpg" },
    at: { line: 44, character: 7 },
  },
  {
    content: { kind: "file", mediaKind: "audio", name: "interview.mp3" },
    path: "Media/interview.mp3",
    at,
  },
];

const texts = (selector: string): string[] =>
  [...container.querySelectorAll(selector)].map((node) => node.textContent ?? "");

describe("the gallery of a record", () => {
  it("captions every file the record links, in order", () => {
    renderGallery(container, MARIE, host);

    expect(texts(".gedcom-desk-tile-caption")).toEqual([
      "Marie Skłodowska-Curie",
      "Marie, on the left",
      "A portrait",
      "Media/lost.jpg",
      "interview.mp3",
    ]);
  });

  it("cuts a picture to the part its link names", () => {
    renderGallery(container, MARIE, host);
    const [, cropped] = container.querySelectorAll<HTMLElement>(".gedcom-desk-picture");

    expect(cropped?.classList.contains("is-cropped")).toBe(true);
    expect(cropped?.style.getPropertyValue("height")).toBe("120px");
    expect(cropped?.querySelector("img")?.style.getPropertyValue("transform")).toContain("translate(");
  });

  it("names what is not drawn: from the web, not in the vault, another kind of file", () => {
    renderGallery(container, MARIE, host);

    expect(texts(".gedcom-desk-tile-note")).toEqual([
      "From the web, not loaded", "Not in the vault", "Audio",
    ]);
    expect(container.querySelectorAll("img")).toHaveLength(2);
  });

  it("opens a file in the vault, and not one from the web or a missing one", () => {
    renderGallery(container, MARIE, host);
    const faces = container.querySelectorAll<HTMLButtonElement>(".gedcom-desk-tile-face");
    faces.forEach((face) => face.click());

    expect(host.openFile.mock.calls.map(([path]) => path)).toEqual([
      "Media/marie-sklodowska-curie.svg",
      "Media/curie-family-1908.svg",
      "Media/interview.mp3",
    ]);
  });

  it("leads to the media page, and from a missing file to its line", () => {
    renderGallery(container, MARIE, host);
    const links = [...container.querySelectorAll<HTMLElement>(".gedcom-desk-link")];
    links.find((link) => link.textContent === "Media page")?.click();
    links.find((link) => link.textContent === "Show in source")?.click();

    expect(host.openRecord).toHaveBeenCalledWith("@O1@");
    expect(host.showInSource.mock.calls[0]?.[0].start.line).toBe(44);
  });

  it("draws nothing for a record that links no file", () => {
    renderGallery(container, [], host);

    expect(container.children).toHaveLength(0);
  });
});

describe("a portrait", () => {
  it("is the first image the record links", () => {
    renderPortrait(container, MARIE);

    expect(container.querySelector<HTMLImageElement>(".gedcom-desk-portrait img")?.src)
      .toBe("app://marie.svg");
  });

  it("is absent where no linked file is an image", () => {
    renderPortrait(container, MARIE.slice(2));

    expect(container.querySelector(".gedcom-desk-portrait")).toBeNull();
  });
});
