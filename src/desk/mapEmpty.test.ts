// @vitest-environment happy-dom
import { beforeAll, describe, expect, it, vi } from "vitest";

import { installObsidianDom } from "../testing/obsidianDom";
import { emptyStateOf, MapEmpty } from "./mapEmpty";

beforeAll(installObsidianDom);

describe("when the empty state shows", () => {
  it("is not shown before the places table has been read", () => {
    expect(emptyStateOf({ read: false, places: 3, mapped: 0, tableExists: false })).toEqual({ show: false });
  });

  it("is not shown where some place is mapped", () => {
    expect(emptyStateOf({ read: true, places: 3, mapped: 1, tableExists: false })).toEqual({ show: false });
  });

  it("says no place has a coordinate and offers to create the table", () => {
    expect(emptyStateOf({ read: true, places: 3, mapped: 0, tableExists: false })).toEqual({ show: true, cause: "none", button: "create" });
  });

  it("offers to open a table that exists with no coordinates in it", () => {
    expect(emptyStateOf({ read: true, places: 3, mapped: 0, tableExists: true })).toMatchObject({ button: "open" });
  });

  it("offers nothing where the file names no place", () => {
    expect(emptyStateOf({ read: true, places: 0, mapped: 0, tableExists: false })).toEqual({ show: true, cause: "no-places", button: null });
  });
});

describe("the empty state", () => {
  function made() {
    const act = vi.fn();
    const empty = new MapEmpty(document.body, act);
    return { empty, act };
  }

  it("names its cause and calls its host once from the button", () => {
    const { empty, act } = made();
    empty.show({ show: true, cause: "none", button: "create" });
    empty.el.querySelector("button")?.click();

    expect(empty.el.querySelector("h3")?.textContent).toBe("No place has coordinates yet");
    expect(empty.el.querySelector("p")?.textContent).toBe("No place in the file has coordinates, and no row of the places table gives any.");
    expect(empty.el.querySelector("button")?.textContent).toBe("Create the places table");
    expect(act).toHaveBeenCalledOnce();
  });

  it("reads Open the places table where one exists and has no button for a file without places", () => {
    const { empty } = made();
    empty.show({ show: true, cause: "none", button: "open" });
    expect(empty.el.querySelector("button")?.textContent).toBe("Open the places table");
    empty.show({ show: true, cause: "no-places", button: null });

    expect(empty.el.querySelector("button")).toBeNull();
    expect(empty.el.querySelector("p")?.textContent).toBe("The file names no place.");
  });

  it("hides itself", () => {
    const { empty } = made();
    empty.show({ show: false });

    expect(empty.el.style.display).toBe("none");
  });
});
