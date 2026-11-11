import type { Position, Range } from "@domorium/language-service";

import curie from "../demo-vault/curie.ged";
import { mediaPreviewContent, mediaVaultPath } from "../src/editor/media";
import type { MediaItem } from "../src/desk/media";
import { addableAt, choicesAt, describes, holdsValueAt, pairedAt, pointerChoicesAt, proseAt, removableAt } from "../src/desk/addableFields";
import { addAt, checkValue, commit, removeAt, requiredBeneath, setValueAt } from "../src/desk/edits";
import { renderRecordCard, type CardTab, type CardView } from "../src/desk/recordCard";
import { TreeSession } from "../src/desk/detail/treeSession";
import { buildIndex, type GenealogyIndex } from "../src/genealogy";
import { setLanguage } from "../src/i18n";
import { curieWithPlan } from "../src/testing/curie";
import { installObsidianDom } from "../src/testing/obsidianDom";
import { TextTab } from "../src/testing/textTab";
import { stubSetIcon } from "./icons";

export interface DeskOptions {
  /** A GEDCOM text; the demo vault's curie.ged where none is given. */
  doc?: string;
  /** The selected record; the first person where omitted, none for an empty string. */
  record?: string;
  dark?: boolean;
  phone?: boolean;
  /** The card's width in pixels: 360 where omitted, 390 on a phone. */
  width?: number;
  language?: string;
  /** Draws the card as it is with no GEDCOM tab. */
  noTab?: boolean;
  /** The demo file with a record of its own, `@P1@ _PLAN`. */
  plan?: boolean;
}

export interface DeskCalls {
  shownInSource: Range[];
  filesOpened: string[];
  /** The questions asked before a removal, answered by `confirm`. */
  asked: string[];
}

/** What is in demo-vault, which the harness page reaches as ../demo-vault/. */
const VAULT_FILES = new Set([
  "Media/curie-family-1908.svg",
  "Media/irene-joliot-curie.svg",
  "Media/marie-sklodowska-curie.svg",
  "Media/pierre-curie.svg",
  "Sources/nobel-diploma-1903.svg",
]);

declare global {
  interface Window {
    desk: {
      mount(options: DeskOptions): void;
      calls: DeskCalls;
      record(): string | null;
      selectRecord(xref: string): void;
      /** The text of the tab as the card has written it. */
      text(): string;
      /** Changes the text from outside the card, as Source would. */
      replace(text: string): void;
      /** Answers the question asked before a removal. */
      confirm(): void;
    };
  }
}

installObsidianDom();

const calls: DeskCalls = { shownInSource: [], filesOpened: [], asked: [] };
let doc: TextTab;
let index: GenealogyIndex;
let indexed = -1;
let confirmed: (() => void) | null = null;
const service = () => doc.service();
let record: string | null = null;
let hasTab = true;
let session = new TreeSession();

function element(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) {
    throw new Error(`harness: #${id} is missing`);
  }
  return found;
}

function mediaItem(at: Position): MediaItem | null {
  const reference = service().getMediaAt(at);
  if (!reference) {
    return null;
  }
  const vault = {
    documentPath: "curie.ged",
    dialect: service().getDocument().getDialect(),
    resolve: (path: string) => (VAULT_FILES.has(path) ? `../demo-vault/${path}` : null),
  };
  const content = mediaPreviewContent(reference, vault);
  const path = mediaVaultPath(reference, vault);
  return { content, at, ...(path && content.kind !== "missing" ? { path } : {}) };
}

const tab: CardTab = {
  filePath: () => "curie.ged",
  index: () => {
    if (indexed !== doc.version) {
      index = buildIndex(service());
      indexed = doc.version;
    }
    return index;
  },
  selection: () => ({ record }),
  mediaItem,
  select: (xref) => {
    selectRecord(xref);
  },
  showInSource: (range) => {
    calls.shownInSource.push(range);
  },
  openFile: (path) => {
    calls.filesOpened.push(path);
  },
  addableAt: (at) => addableAt(service(), at),
  choicesAt: (at) => choicesAt(service(), at),
  proseAt: (at) => proseAt(service(), at),
  holdsValueAt: (at) => holdsValueAt(service(), at),
  removableAt: (parent, tag) => removableAt(service(), parent, tag),
  pointerChoicesAt: (parent, tag) => pointerChoicesAt(service(), parent, tag),
  pairedAt: (parent, tag) => pairedAt(service(), parent, tag),
  requiredBeneath: (field) => requiredBeneath(service(), field),
  checkValue: (at, tag, input, replacing) => checkValue(service(), at, tag, input, replacing),
  version: () => doc.version,
  describes: (at) => describes(service(), at),
  setValueAt: (at, input, version) => commit(doc, setValueAt(service(), at, version, input)),
  addAt: (at, tag, input, version) => commit(doc, addAt(service(), at, version, tag, input)),
  removeAt: (at, nested, version, done) => {
    const go = (): void => {
      confirmed = null;
      done(commit(doc, removeAt(service(), at, version)));
    };
    if (nested === 0) {
      go();
    } else {
      calls.asked.push(String(nested));
      confirmed = go;
    }
  },
  settle: () => {
    draw();
  },
};

/** Stands in for Obsidian's menu and list, which the harness cannot load: a list of buttons that call the same callbacks. */
function chooser(items: { title: string; disabled?: boolean; checked?: boolean; act: () => void }[], at?: { x: number; y: number }): void {
  document.querySelector(".harness-chooser")?.remove();
  const box = document.body.createDiv({ cls: "harness-chooser" });
  box.setAttribute("role", "menu");
  box.setCssProps({ left: `${at?.x ?? 0}px`, top: `${at?.y ?? 0}px` });
  for (const item of items) {
    const button = box.createEl("button", { text: `${item.checked ? "✓ " : ""}${item.title}` });
    button.setAttribute("role", "menuitem");
    button.disabled = item.disabled ?? false;
    button.addEventListener("click", () => {
      box.remove();
      item.act();
    });
  }
}

const view: Omit<CardView, "setIcon" | "session"> = {
  chooseField: (at, fields) => {
    chooser(fields.map((one) => ({ title: one.title, disabled: one.disabled, act: one.choose })), at);
  },
  chooseValues: (at, values) => {
    chooser(values.map((one) => ({ title: one.title, checked: one.checked, act: one.toggle })), at);
  },
  choosePointer: (choices, chosen) => {
    chooser(choices.map((one) => ({ title: one.title, checked: one.checked, act: () => chosen(one.xref) })));
  },
};

function selectRecord(xref: string): void {
  record = xref;
  draw();
}

function draw(): void {
  renderRecordCard(element("card"), hasTab ? tab : null, {
    setIcon: stubSetIcon,
    session,
    ...view,
  });
}

function mount(options: DeskOptions): void {
  setLanguage(options.language ?? "en");
  document.body.classList.toggle("theme-dark", options.dark ?? false);
  document.body.classList.toggle("theme-light", !(options.dark ?? false));
  const phone = options.phone ?? false;
  element("desk-layout").classList.toggle("is-phone", phone);
  document.body.classList.toggle("is-mobile", phone);
  document.body.classList.toggle("is-phone", phone);
  element("card-pane").style.width = `${options.width ?? (phone ? 390 : 360)}px`;
  calls.shownInSource = [];
  calls.filesOpened = [];
  calls.asked = [];
  confirmed = null;
  doc = new TextTab(options.doc ?? (options.plan ? curieWithPlan() : curie));
  indexed = -1;
  index = tab.index();
  hasTab = !(options.noTab ?? false);
  session = new TreeSession();
  const first = options.record ?? index.people.find((row) => row.xref)?.xref ?? "";
  record = first === "" ? null : first;
  element("card").empty();
  draw();
}

window.desk = {
  mount,
  calls,
  record: () => record,
  selectRecord,
  text: () => doc.text,
  replace: (text) => {
    doc.replace(text);
  },
  confirm: () => {
    confirmed?.();
  },
};
