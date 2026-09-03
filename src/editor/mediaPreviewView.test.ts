// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";

import type { MediaPreviewContent } from "./media";
import {
  renderMediaPreview,
  type AllowScope,
  type MediaPreviewHost,
} from "./mediaPreviewView";

let container: HTMLElement;
let answers: AllowScope[];

function host(overrides: Partial<MediaPreviewHost> = {}): MediaPreviewHost {
  return {
    container,
    bounds: { width: 400, height: 300 },
    setIcon: () => undefined,
    isCurrent: () => true,
    allow: (scope) => answers.push(scope),
    ...overrides,
  };
}

const draw = (
  content: MediaPreviewContent,
  overrides: Partial<MediaPreviewHost> = {},
): void => {
  renderMediaPreview(content, host(overrides));
};

const text = (selector: string): string =>
  container.querySelector(selector)?.textContent ?? "";

const labels = (): string[] =>
  [...container.querySelectorAll(".gedcom-media-allow")].map(
    (button) => button.textContent ?? "",
  );

beforeEach(() => {
  container = document.createElement("div");
  answers = [];
});

describe("the row a remote file is shown as", () => {
  it("offers the way out beside the refusal, where one has not been asked for", () => {
    draw({ kind: "remote", url: "https://example.org/marie.jpg", state: "unasked" });

    expect(text(".gedcom-media-note")).toBe("Remote file, not loaded");
    expect(text(".gedcom-media-name")).toBe("https://example.org/marie.jpg");
    expect(labels()).toEqual([
      "Show this image",
      "Always show images from the web",
    ]);
  });

  it("says which answer was pressed", () => {
    draw({ kind: "remote", url: "https://example.org/marie.jpg", state: "unasked" });
    const buttons = [...container.querySelectorAll(".gedcom-media-allow")];
    (buttons[1] as HTMLElement).click();
    (buttons[0] as HTMLElement).click();

    expect(answers).toEqual(["always", "once"]);
  });

  it("offers nothing for an address it will not fetch whatever the answer", () => {
    draw({ kind: "remote", url: "http://example.org/marie.jpg", state: "insecure" });

    expect(text(".gedcom-media-note")).toBe("Unencrypted address, not loaded");
    expect(labels()).toEqual([]);
  });

  it("offers nothing for remote media there is no picture in", () => {
    draw({
      kind: "remote",
      url: "https://example.org/interview.mp3",
      state: "not-an-image",
    });

    expect(text(".gedcom-media-note")).toBe("Remote file, not loaded");
    expect(labels()).toEqual([]);
  });

  it("draws no offer where the host has none to give", () => {
    draw(
      { kind: "remote", url: "https://example.org/marie.jpg", state: "unasked" },
      { allow: undefined },
    );

    expect(labels()).toEqual([]);
  });
});

describe("an image that does not draw", () => {
  const fail = (): void => {
    container
      .querySelector(".gedcom-media-image")
      ?.dispatchEvent(new Event("error"));
  };

  it("says a remote one could not be loaded, and names the url", () => {
    draw({
      kind: "image",
      url: "https://example.org/marie.jpg",
      name: "marie.jpg",
      remote: true,
    });
    fail();

    expect(text(".gedcom-media-note")).toBe("Image could not be loaded");
    expect(text(".gedcom-media-name")).toBe("https://example.org/marie.jpg");
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });

  it("says a vault one could not be drawn, and names the file", () => {
    draw({ kind: "image", url: "app://marie", name: "marie.jpg" });
    fail();

    expect(text(".gedcom-media-note")).toBe("Image could not be drawn");
    expect(text(".gedcom-media-name")).toBe("marie.jpg");
  });

  it("leaves a popover the gesture has moved on from alone", () => {
    draw(
      {
        kind: "image",
        url: "https://example.org/marie.jpg",
        name: "marie.jpg",
        remote: true,
      },
      { isCurrent: () => false },
    );
    fail();

    expect(text(".gedcom-media-note")).toBe("");
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });
});
