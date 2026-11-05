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
  attr?: Record<string, string | number | boolean | null>;
  title?: string;
  type?: string;
  value?: string;
  placeholder?: string;
}

const IMPLEMENTED = new Set(["cls", "text", "attr", "title", "type", "value", "placeholder"]);

function create(
  doc: Document,
  tag: string,
  options: DomOptions | string = {},
): HTMLElement {
  if (typeof options === "string") {
    options = { cls: options };
  }
  for (const key of Object.keys(options)) {
    if (!IMPLEMENTED.has(key)) {
      throw new Error(`obsidianDom: ${key} is used but not implemented`);
    }
  }
  const node = doc.createElement(tag);
  if (options.cls) {
    node.classList.add(
      ...(Array.isArray(options.cls) ? options.cls : options.cls.split(" ")),
    );
  }
  if (options.text !== undefined) {
    node.textContent = options.text;
  }
  for (const [name, value] of Object.entries(options.attr ?? {})) {
    if (value !== null) {
      node.setAttribute(name, String(value));
    }
  }
  for (const name of ["title", "type", "placeholder"] as const) {
    if (options[name] !== undefined) {
      node.setAttribute(name, options[name]);
    }
  }
  if (options.value !== undefined) {
    (node as HTMLInputElement).value = options.value;
  }
  return node;
}

function build(
  parent: HTMLElement,
  tag: string,
  options?: DomOptions | string,
): HTMLElement {
  const node = create(parent.ownerDocument, tag, options);
  parent.append(node);
  return node;
}

/** Call once, from a test that imports a module using Obsidian's helpers. */
export function installObsidianDom(): void {
  Object.defineProperty(Document.prototype, "win", {
    configurable: true,
    get(this: Document) {
      return this.defaultView ?? window;
    },
  });
  (window as unknown as Record<string, unknown>).createEl = (
    tag: string,
    options?: DomOptions | string,
  ) => create(window.document, tag, options);
  (window as unknown as Record<string, unknown>).createDiv = (options?: DomOptions | string) =>
    create(window.document, "div", options);
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
  proto.removeClass = function (...classes: string[]) {
    (this as unknown as HTMLElement).classList.remove(...classes);
  };
  proto.hasClass = function (name: string) {
    return (this as unknown as HTMLElement).classList.contains(name);
  };
  proto.toggleClass = function (classes: string | string[], value: boolean) {
    for (const name of Array.isArray(classes) ? classes : [classes]) {
      (this as unknown as HTMLElement).classList.toggle(name, value);
    }
  };
  proto.setCssProps = function (props: Record<string, string>) {
    for (const [name, value] of Object.entries(props)) {
      (this as unknown as HTMLElement).style.setProperty(name, value);
    }
  };
  proto.toggle = function (show: boolean) {
    (this as unknown as HTMLElement).style.display = show ? "" : "none";
  };
  proto.setText = function (text: string) {
    (this as unknown as HTMLElement).textContent = text;
  };
}
