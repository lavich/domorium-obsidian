import type { Position, Range } from "@domorium/language-service";

import type { GenealogyIndex } from "../genealogy";
import { t } from "../i18n";
import { renderEvidenceSection } from "./evidence";
import { renderFamilyPage } from "./familyPage";
import type { PortraitContent } from "./graphCanvas";
import { familyTitle, personName, sourceTitle } from "./labels";
import type { MediaItem } from "./media";
import { renderMediaPage } from "./mediaPage";
import type { NoteHit } from "./noteLinks";
import { eventAt, eventTitle } from "./eventRows";
import { renderEventPage } from "./eventPage";
import { placeAt } from "./placeRows";
import { renderPlacePage } from "./placePage";
import { renderPersonPage, type FactKey, type PageHost } from "./personPage";
import { renderSourcePage } from "./sourcePage";

export interface CardTab {
  filePath(): string | null;
  index(): GenealogyIndex;
  selection(): { record: string | null; fact: FactKey | null };
  mediaItems(media: { at: Position; record?: string }[]): MediaItem[];
  mediaItem(at: Position): MediaItem | null;
  portrait(xref: string): PortraitContent | null;
  select(xref: string): void;
  selectFact(key: FactKey | null): void;
  showInSource(range: Range): void;
  openFile(path: string): void;
  history(): { canBack: boolean; canForward: boolean };
  back(): void;
  forward(): void;
}

export interface CardView {
  setIcon(element: HTMLElement, icon: string): void;
  openNote(path: string, line: number): void;
}

const FOCUS_KEY = "data-focus-key";

function recordName(index: GenealogyIndex, xref: string): string {
  const person = index.person(xref);
  if (person) {
    return personName(person);
  }
  const family = index.family(xref);
  if (family) {
    return familyTitle(family.spouseNames);
  }
  const source = index.source(xref);
  if (source) {
    return sourceTitle(source.title);
  }
  const media = index.media(xref);
  const event = eventAt(index, xref);
  return media?.title ?? media?.file ?? placeAt(index, xref)?.name ?? (event ? eventTitle(event.event) : t("desk.media"));
}

export function renderRecordCard(
  container: HTMLElement,
  tab: CardTab | null,
  notes: NoteHit[] | null,
  view: CardView,
): void {
  const root = container.querySelector<HTMLElement>(":scope > .gedcom-card") ?? makeRoot(container);
  const live = root.querySelector<HTMLElement>(":scope > .gedcom-card-live");
  const before = root.querySelector<HTMLElement>(":scope > .gedcom-card-body");
  const doc = container.ownerDocument;
  const active = doc.activeElement;
  const focusWas = active !== null && root.contains(active) ? active : null;
  const focusKey = focusWas?.closest(`[${FOCUS_KEY}]`)?.getAttribute(FOCUS_KEY) ?? null;
  const scrollTop = before?.scrollTop ?? 0;
  const previous = root.getAttribute("data-shown");

  for (const stale of [...root.children]) {
    if (stale !== live) {
      stale.remove();
    }
  }

  const selection = tab?.selection() ?? { record: null, fact: null };
  const index = tab?.index();
  const record = tab && index && selection.record && pageKind(index, selection.record) ? selection.record : null;
  const shown = tab && record ? `${tab.filePath() ?? ""}\n${record}` : "";

  if (tab) {
    renderHeader(root, tab, view, index && record ? recordName(index, record) : null);
  }
  const body = root.createDiv({ cls: "gedcom-card-body" });
  body.setAttribute("tabindex", "-1");

  if (!tab || !index) {
    body.createDiv({ cls: "gedcom-desk-none gedcom-card-state", text: t("card.noTab") });
  } else if (!record) {
    const holdsNothing = index.people.length === 0 && index.families.length === 0 && index.sources.length === 0;
    body.createDiv({
      cls: "gedcom-desk-none gedcom-card-state",
      text: t(holdsNothing ? "card.empty" : "card.nothing"),
    });
  } else {
    drawRecord(body, tab, index, record, selection.fact, notes, view);
  }

  root.setAttribute("data-shown", shown);
  if (live && shown !== previous) {
    live.setText(tab && index && record ? t("card.announce", { name: recordName(index, record) }) : "");
  }
  if (shown === previous) {
    body.scrollTop = scrollTop;
  }
  if (focusWas !== null) {
    const same =
      focusKey === null
        ? null
        : [...root.querySelectorAll<HTMLElement>(`[${FOCUS_KEY}]`)].find((one) => one.getAttribute(FOCUS_KEY) === focusKey);
    (same ?? body).focus({ preventScroll: true });
  }
}

function pageKind(index: GenealogyIndex, xref: string): boolean {
  return Boolean(index.person(xref) ?? index.family(xref) ?? index.source(xref) ?? index.media(xref) ?? placeAt(index, xref) ?? eventAt(index, xref));
}

function makeRoot(container: HTMLElement): HTMLElement {
  container.empty();
  const root = container.createDiv({ cls: "gedcom-card" });
  const live = root.createDiv({ cls: ["gedcom-card-live", "gedcom-visually-hidden"] });
  live.setAttribute("aria-live", "polite");
  live.setAttribute("role", "status");
  return root;
}

function renderHeader(root: HTMLElement, tab: CardTab, view: CardView, name: string | null): void {
  const head = root.createDiv({ cls: "gedcom-card-head" });
  const { canBack, canForward } = tab.history();
  const button = (label: "card.back" | "card.forward", icon: string, enabled: boolean, go: () => void): void => {
    const element = head.createEl("button", { cls: ["gedcom-card-nav", "clickable-icon"] });
    element.setAttribute("type", "button");
    element.setAttribute("aria-label", t(label));
    element.setAttribute(FOCUS_KEY, label);
    if (!enabled) {
      element.setAttribute("disabled", "");
    }
    view.setIcon(element, icon);
    element.addEventListener("click", go);
  };
  button("card.back", "chevron-left", canBack, () => tab.back());
  button("card.forward", "chevron-right", canForward, () => tab.forward());
  if (name !== null) {
    const title = head.createDiv({ cls: "gedcom-card-head-name", text: name });
    title.setAttribute("aria-hidden", "true");
  }
}

function drawRecord(
  body: HTMLElement,
  tab: CardTab,
  index: GenealogyIndex,
  record: string,
  fact: FactKey | null,
  notes: NoteHit[] | null,
  view: CardView,
): void {
  const host: PageHost & { openFile(path: string): void } = {
    openRecord: (xref) => tab.select(xref),
    select: (key) => tab.selectFact(key),
    showInSource: (range) => tab.showInSource(range),
    scrollToEvidence: () => scrollToEvidence(body),
    openFile: (path) => tab.openFile(path),
    setIcon: (element, icon) => view.setIcon(element, icon),
    portrait: (xref) => tab.portrait(xref),
  };
  const person = index.person(record);
  const family = person ? undefined : index.family(record);
  const source = person || family ? undefined : index.source(record);
  const media = person || family || source ? undefined : index.media(record);
  const place = person || family || source || media ? undefined : placeAt(index, record);
  const event = person || family || source || media || place ? undefined : eventAt(index, record);
  if (person) {
    renderPersonPage(body, person, index, { selected: fact, media: tab.mediaItems(person.media) }, host);
  } else if (family) {
    renderFamilyPage(body, family, index, { selected: fact, media: tab.mediaItems(family.media) }, host);
  } else if (source) {
    renderSourcePage(body, source, index, host, tab.mediaItems(source.media));
  } else if (media) {
    const whole = media.at ? tab.mediaItem(media.at) : null;
    renderMediaPage(
      body,
      media,
      { whole, links: media.links.map((link) => tab.mediaItem(link.at) ?? missingAt(link.at)) },
      index,
      host,
    );
  } else if (place) {
    renderPlacePage(body, place, index, host);
    return;
  } else if (event) {
    renderEventPage(body, event, index, host);
    return;
  }
  renderEvidenceSection(
    body,
    { index, record, fact: person || family ? fact : null, notes },
    {
      openRecord: (xref) => tab.select(xref),
      showInSource: (range) => tab.showInSource(range),
      wholeRecord: () => tab.selectFact(null),
      openNote: (path, line) => view.openNote(path, line),
    },
  );
}

function missingAt(at: Position): MediaItem {
  return { content: { kind: "missing", target: "" }, at };
}

function scrollToEvidence(body: HTMLElement): void {
  const heading = body.querySelector<HTMLElement>(".gedcom-card-evidence > h2");
  const reduced = body.ownerDocument.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  heading?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}
