import { GedcomLanguageService, type Position, type Range } from "@domorium/language-service";

import curie from "../demo-vault/curie.ged";
import { mediaPreviewContent, mediaVaultPath } from "../src/editor/media";
import type { MediaItem } from "../src/desk/media";
import { renderRecordCard, type CardTab } from "../src/desk/recordCard";
import { TreeSession } from "../src/desk/detail/treeSession";
import { buildIndex, type GenealogyIndex } from "../src/genealogy";
import { setLanguage } from "../src/i18n";
import { installObsidianDom } from "../src/testing/obsidianDom";
import type { PortraitContent } from "../src/desk/media";
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
}

export interface DeskCalls {
  shownInSource: Range[];
  filesOpened: string[];
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
    };
  }
}

installObsidianDom();

const calls: DeskCalls = { shownInSource: [], filesOpened: [] };
let service: GedcomLanguageService;
let index: GenealogyIndex;
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
  const reference = service.getMediaAt(at);
  if (!reference) {
    return null;
  }
  const vault = {
    documentPath: "curie.ged",
    dialect: service.getDocument().getDialect(),
    resolve: (path: string) => (VAULT_FILES.has(path) ? `../demo-vault/${path}` : null),
  };
  const content = mediaPreviewContent(reference, vault);
  const path = mediaVaultPath(reference, vault);
  return { content, at, ...(path && content.kind !== "missing" ? { path } : {}) };
}

function mediaItems(media: { at: Position; record?: string }[]): MediaItem[] {
  return media.flatMap((one) => {
    const item = mediaItem(one.at);
    return item ? [{ ...item, ...(one.record ? { record: one.record } : {}) }] : [];
  });
}

const tab: CardTab = {
  filePath: () => "curie.ged",
  index: () => index,
  selection: () => ({ record }),
  mediaItems,
  mediaItem,
  portrait: (xref: string): PortraitContent | null => {
    const person = index.person(xref);
    const found = person ? mediaItems(person.media).find((item) => item.content.kind === "image") : undefined;
    return found?.content.kind === "image" ? found.content : null;
  },
  select: (xref) => {
    selectRecord(xref);
  },
  showInSource: (range) => {
    calls.shownInSource.push(range);
  },
  openFile: (path) => {
    calls.filesOpened.push(path);
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
  service = new GedcomLanguageService(options.doc ?? curie);
  index = buildIndex(service);
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
};
