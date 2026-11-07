// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { GraphInput, type GraphInputHost } from "./graphInput";

it("keeps a touch on the graph from reaching the workspace that opens the side panels", () => {
  const outer = document.createElement("div");
  const el = document.createElement("div");
  outer.appendChild(el);
  const host = { el } as unknown as GraphInputHost;
  new GraphInput(host).listen();
  const seen = vi.fn();
  outer.addEventListener("touchstart", seen);
  outer.addEventListener("touchmove", seen);

  el.dispatchEvent(new Event("touchstart", { bubbles: true }));
  el.dispatchEvent(new Event("touchmove", { bubbles: true }));

  expect(seen).not.toHaveBeenCalled();
});
