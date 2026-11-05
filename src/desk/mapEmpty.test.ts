// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from "vitest";

import { installObsidianDom } from "../testing/obsidianDom";
import { emptyStateOf, MapEmpty } from "./mapEmpty";

beforeAll(installObsidianDom);

describe("when the empty state shows", () => {
  it("is not shown before the file has been read", () => {
    expect(emptyStateOf({ read: false, places: 3, mapped: 0 })).toEqual({ show: false });
  });

  it("is not shown where some place is mapped", () => {
    expect(emptyStateOf({ read: true, places: 3, mapped: 1 })).toEqual({ show: false });
  });

  it("says no place has a coordinate", () => {
    expect(emptyStateOf({ read: true, places: 3, mapped: 0 })).toEqual({ show: true, cause: "none" });
  });

  it("says the file names no place", () => {
    expect(emptyStateOf({ read: true, places: 0, mapped: 0 })).toEqual({ show: true, cause: "no-places" });
  });
});

describe("the empty state", () => {
  function made() {
    return new MapEmpty(document.body);
  }

  it("explains where a position comes from and shows the lines of a MAP", () => {
    const empty = made();
    empty.show({ show: true, cause: "none" });

    expect(empty.el.querySelector("h3")?.textContent).toBe("No place has coordinates yet");
    expect(empty.el.querySelector("p")?.textContent).toBe("A place gets a position from a MAP with LATI and LONG under its PLAC in the file.");
    expect(empty.el.querySelector("pre")?.textContent).toBe("2 PLAC Paris, France\n3 MAP\n4 LATI N48.8566\n4 LONG E2.3522");
  });

  it("has no button", () => {
    const empty = made();
    empty.show({ show: true, cause: "none" });

    expect(empty.el.querySelector("button")).toBeNull();
  });

  it("says the file names no place and shows no example", () => {
    const empty = made();
    empty.show({ show: true, cause: "no-places" });

    expect(empty.el.querySelector("p")?.textContent).toBe("The file names no place.");
    expect(empty.el.querySelector("pre")).toBeNull();
  });

  it("hides itself", () => {
    const empty = made();
    empty.show({ show: false });

    expect(empty.el.style.display).toBe("none");
  });
});
