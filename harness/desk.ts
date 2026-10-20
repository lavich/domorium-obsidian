import { GedcomLanguageService, type Range } from "@domorium/language-service";

import curie from "../demo-vault/curie.ged";
import { renderEvidence } from "../src/desk/evidence";
import { IndexList } from "../src/desk/indexList";
import { renderFamilyPage } from "../src/desk/familyPage";
import { renderPersonPage, type FactKey } from "../src/desk/personPage";
import { renderSourcePage } from "../src/desk/sourcePage";
import { buildIndex, type GenealogyIndex } from "../src/genealogy";
import { setLanguage } from "../src/i18n";
import { installObsidianDom } from "../src/testing/obsidianDom";

export interface DeskOptions {
  /** A GEDCOM text; the demo vault's curie.ged where none is given. */
  doc?: string;
  record?: string;
  dark?: boolean;
  phone?: boolean;
  language?: string;
}

export interface DeskCalls {
  shownInSource: Range[];
  evidenceOpened: number;
}

declare global {
  interface Window {
    desk: {
      mount(options: DeskOptions): void;
      calls: DeskCalls;
      record(): string;
      selected(): FactKey | null;
    };
  }
}

installObsidianDom();

const calls: DeskCalls = { shownInSource: [], evidenceOpened: 0 };
let index: GenealogyIndex;
let record = "@I1@";
let selected: FactKey | null = null;
let phone = false;
let list: IndexList | null = null;

function element(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) {
    throw new Error(`harness: #${id} is missing`);
  }
  return found;
}

const host = {
  openRecord: (xref: string): void => {
    record = xref;
    selected = null;
    draw();
  },
  select: (fact: FactKey | null): void => {
    selected = fact;
    draw();
  },
  showInSource: (range: Range): void => {
    calls.shownInSource.push(range);
  },
  openEvidence: (): void => {
    calls.evidenceOpened += 1;
  },
};

function draw(): void {
  const page = element("page");
  const person = index.person(record);
  const family = index.family(record);
  const source = index.source(record);
  if (person) {
    renderPersonPage(page, person, index, { selected, phone }, host);
  } else if (family) {
    renderFamilyPage(page, family, index, { selected, phone }, host);
  } else if (source) {
    renderSourcePage(page, source, index, host);
  }
  list?.show({ name: "curie.ged", index, version: "7.0", current: record });
  renderEvidence(element("evidence-pane"), { index, record, fact: selected }, {
    openRecord: host.openRecord,
    showInSource: host.showInSource,
    wholeRecord: () => host.select(null),
  });
}

function mount(options: DeskOptions): void {
  setLanguage(options.language ?? "en");
  document.body.classList.toggle("theme-dark", options.dark ?? false);
  document.body.classList.toggle("theme-light", !(options.dark ?? false));
  phone = options.phone ?? false;
  element("desk-layout").classList.toggle("is-phone", phone);
  calls.shownInSource = [];
  calls.evidenceOpened = 0;
  index = buildIndex(new GedcomLanguageService(options.doc ?? curie).getDocumentSymbols());
  record = options.record ?? index.people.find((row) => row.xref)?.xref ?? "";
  selected = null;
  list = new IndexList(element("index-pane"), { open: host.openRecord });
  draw();
}

window.desk = {
  mount,
  calls,
  record: () => record,
  selected: () => selected,
};
