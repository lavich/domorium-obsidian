import { GedcomLanguageService, type Position, type Range } from "@domorium/language-service";

import curie from "../demo-vault/curie.ged";
import { renderEvidence } from "../src/desk/evidence";
import { IndexList } from "../src/desk/indexList";
import { mediaPreviewContent } from "../src/editor/media";
import { renderFamilyPage } from "../src/desk/familyPage";
import type { MediaItem } from "../src/desk/media";
import { renderMediaPage } from "../src/desk/mediaPage";
import type { NoteHit } from "../src/desk/noteLinks";
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
  filesOpened: string[];
  notesOpened: { path: string; line: number }[];
}

/** What is in demo-vault, which the harness page reaches as ../demo-vault/. */
const VAULT_FILES = new Set([
  "Media/curie-family-1908.svg",
  "Media/irene-joliot-curie.svg",
  "Media/marie-sklodowska-curie.svg",
  "Media/pierre-curie.svg",
  "Sources/nobel-diploma-1903.svg",
]);

/** A note of the demo vault, as Obsidian's link cache would yield it for Marie. */
const MARIE_NOTES: NoteHit[] = [
  {
    path: "Notes/Radium.md",
    name: "Radium",
    lines: [{ line: 6, before: "announced in December 1898 by ", link: "Marie Skłodowska-Curie", after: " and" }],
  },
];

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

const calls: DeskCalls = { shownInSource: [], evidenceOpened: 0, filesOpened: [], notesOpened: [] };
let service: GedcomLanguageService;
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
  openFile: (path: string): void => {
    calls.filesOpened.push(path);
  },
};

function mediaItem(at: Position): MediaItem | null {
  const reference = service.getMediaAt(at);
  if (!reference) {
    return null;
  }
  const content = mediaPreviewContent(reference, {
    documentPath: "curie.ged",
    resolve: (path) => (VAULT_FILES.has(path) ? `../demo-vault/${path}` : null),
  });
  return { content, at, ...(content.kind === "image" || content.kind === "file" ? { path: reference.targetText } : {}) };
}

function mediaItems(media: { at: Position; record?: string }[]): MediaItem[] {
  return media.flatMap((one) => {
    const item = mediaItem(one.at);
    return item ? [{ ...item, ...(one.record ? { record: one.record } : {}) }] : [];
  });
}

function draw(): void {
  const page = element("page");
  const person = index.person(record);
  const family = index.family(record);
  const source = index.source(record);
  const media = index.media(record);
  if (person) {
    renderPersonPage(page, person, index, { selected, phone, media: mediaItems(person.media) }, host);
  } else if (family) {
    renderFamilyPage(page, family, index, { selected, phone, media: mediaItems(family.media) }, host);
  } else if (source) {
    renderSourcePage(page, source, index, host, mediaItems(source.media));
  } else if (media) {
    renderMediaPage(page, media, {
      whole: media.at ? mediaItem(media.at) : null,
      links: media.links.flatMap((link) => mediaItem(link.at) ?? []),
    }, index, host);
  }
  list?.show({ name: "curie.ged", index, version: "7.0", current: record });
  renderEvidence(element("evidence-pane"), {
    index,
    record,
    fact: selected,
    notes: record === "@I1@" ? MARIE_NOTES : [],
  }, {
    openRecord: host.openRecord,
    showInSource: host.showInSource,
    wholeRecord: () => host.select(null),
    openNote: (path, line) => {
      calls.notesOpened.push({ path, line });
    },
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
  calls.filesOpened = [];
  calls.notesOpened = [];
  service = new GedcomLanguageService(options.doc ?? curie);
  index = buildIndex(service.getDocumentSymbols());
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
