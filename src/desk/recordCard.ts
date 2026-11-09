import type { Position, Range } from "@domorium/language-service";

import type { GenealogyIndex } from "../genealogy";
import { t } from "../i18n";
import { renderFamilyPage } from "./familyPage";
import type { PortraitContent } from "./media";
import { familyTitle, personName, sourceTitle } from "./labels";
import type { MediaItem } from "./media";
import { renderMediaPage } from "./mediaPage";
import { pageKind } from "./deskState";
import { eventAt, eventTitle } from "./eventRows";
import { renderEventPage } from "./eventPage";
import { placeAt } from "./placeRows";
import { renderPlacePage } from "./placePage";
import { renderPersonPage, type FactKey, type PageHost, type PersonPageOptions } from "./personPage";
import { renderSourcePage } from "./sourcePage";
import type { TreeSession } from "./detail/treeSession";

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
}

export interface CardView {
  setIcon(element: HTMLElement, icon: string): void;
  /** What the reader chose in the trees of the records shown, kept while the plugin is loaded. */
  session: TreeSession;
}

const FOCUS_KEY = "data-focus-key";
const OPEN_KEY = "data-open";
const TOGGLE_KEY = "tree:toggle";

const hasTree = (index: GenealogyIndex, record: string): boolean =>
  index.person(record) !== undefined || index.family(record) !== undefined || index.source(record) !== undefined;

function foldsOf(root: HTMLElement): Required<Pick<PersonPageOptions, "open" | "folded">> {
  const open = new Set((root.getAttribute(OPEN_KEY) ?? "").split(" ").filter(Boolean));
  return {
    open,
    folded: (id, now) => {
      if (now) {
        open.add(id);
      } else {
        open.delete(id);
      }
      root.setAttribute(OPEN_KEY, [...open].join(" "));
    },
  };
}

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
  return media?.title ?? media?.file ?? placeAt(index, xref)?.name ?? (event ? `${eventTitle(event.event)} · ${recordName(index, event.owner)}` : t("desk.media"));
}

export function renderRecordCard(
  container: HTMLElement,
  tab: CardTab | null,
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

  let drawsTree = false;
  const selection = tab?.selection() ?? { record: null, fact: null };
  const index = tab?.index();
  const record = tab && index && selection.record && pageKind(index, selection.record) ? selection.record : null;
  const shown = tab && record ? `${tab.filePath() ?? ""}\n${record}` : "";

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
    if (shown !== previous) {
      root.removeAttribute(OPEN_KEY);
    }
    drawsTree = hasTree(index, record);
    drawRecord(body, tab, index, record, selection.fact, view, {
      ...foldsOf(root),
      ...(drawsTree ? { tree: view.session.stateFor(shown) } : {}),
    });
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
      focusKey === null || (shown !== previous && focusKey !== TOGGLE_KEY)
        ? null
        : [...root.querySelectorAll<HTMLElement>(`[${FOCUS_KEY}]`)].find((one) => one.getAttribute(FOCUS_KEY) === focusKey);
    (same ?? body).focus({ preventScroll: true });
  }
}

function makeRoot(container: HTMLElement): HTMLElement {
  container.empty();
  const root = container.createDiv({ cls: "gedcom-card" });
  const live = root.createDiv({ cls: ["gedcom-card-live", "gedcom-visually-hidden"] });
  live.setAttribute("aria-live", "polite");
  live.setAttribute("role", "status");
  return root;
}

function drawRecord(
  body: HTMLElement,
  tab: CardTab,
  index: GenealogyIndex,
  record: string,
  fact: FactKey | null,
  view: CardView,
  folds: Pick<PersonPageOptions, "open" | "folded" | "tree">,
): void {
  const host: PageHost & { openFile(path: string): void } = {
    openRecord: (xref) => tab.select(xref),
    select: (key) => tab.selectFact(key),
    showInSource: (range) => tab.showInSource(range),
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
    renderPersonPage(body, person, index, { selected: fact, media: tab.mediaItems(person.media), ...folds }, host);
  } else if (family) {
    renderFamilyPage(body, family, index, { selected: fact, media: tab.mediaItems(family.media), ...folds }, host);
  } else if (source) {
    renderSourcePage(body, source, index, host, tab.mediaItems(source.media), folds);
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
    renderEventPage(body, event, index, host, folds);
  }
}

function missingAt(at: Position): MediaItem {
  return { content: { kind: "missing", target: "" }, at };
}
