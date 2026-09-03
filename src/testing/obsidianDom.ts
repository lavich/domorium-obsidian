/**
 * Obsidian puts these helpers on `HTMLElement` when the application starts. The
 * npm package is types alone — `main` is empty — so a unit test has to bring
 * them, and a module written against them cannot be imported without this.
 *
 * Only what the code under test uses is implemented, and an option that is not
 * implemented throws rather than being dropped: a test that passes on a helper
 * quietly ignoring `attr` would be saying nothing about the application.
 */

interface DomOptions {
  cls?: string | string[];
  text?: string;
}

const IMPLEMENTED = new Set(["cls", "text"]);

function build(
  parent: HTMLElement,
  tag: string,
  options: DomOptions = {},
): HTMLElement {
  for (const key of Object.keys(options)) {
    if (!IMPLEMENTED.has(key)) {
      throw new Error(`obsidianDom: ${key} is used but not implemented`);
    }
  }
  const node = parent.ownerDocument.createElement(tag);
  if (options.cls !== undefined) {
    node.classList.add(
      ...(Array.isArray(options.cls) ? options.cls : options.cls.split(" ")),
    );
  }
  if (options.text !== undefined) {
    node.textContent = options.text;
  }
  parent.append(node);
  return node;
}

/** Call once, from a test that imports a module using Obsidian's helpers. */
export function installObsidianDom(): void {
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  proto.createEl = function (tag: string, options?: DomOptions) {
    return build(this as unknown as HTMLElement, tag, options);
  };
  proto.createDiv = function (options?: DomOptions) {
    return build(this as unknown as HTMLElement, "div", options);
  };
  proto.createSpan = function (options?: DomOptions) {
    return build(this as unknown as HTMLElement, "span", options);
  };
  proto.appendText = function (text: string) {
    (this as unknown as HTMLElement).append(text);
  };
  proto.empty = function () {
    (this as unknown as HTMLElement).replaceChildren();
  };
  proto.addClass = function (...classes: string[]) {
    (this as unknown as HTMLElement).classList.add(...classes);
  };
}
