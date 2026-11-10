import type { PointerCandidate, Position, Range, StructureFieldDescription } from "@domorium/language-service";

import type { GenealogyIndex } from "../genealogy";
import { t } from "../i18n";
import { renderFamilyPage } from "./familyPage";
import { familyTitle, personName, sourceTitle } from "./labels";
import type { MediaItem } from "./media";
import { renderMediaPage } from "./mediaPage";
import { pageKind } from "./deskState";
import { placeAt } from "./placeRows";
import { renderPlacePage } from "./placePage";
import { renderPersonPage, type PageHost, type PersonPageOptions } from "./personPage";
import { renderSourcePage } from "./sourcePage";
import type { FieldChoice, PointerChoice } from "./detail/tree";
import type { TreeSession } from "./detail/treeSession";

export interface CardTab {
  filePath(): string | null;
  index(): GenealogyIndex;
  selection(): { record: string | null };
  mediaItem(at: Position): MediaItem | null;
  select(xref: string): void;
  showInSource(range: Range): void;
  openFile(path: string): void;
  addableAt?(at: Position): StructureFieldDescription[];
  choicesAt?(at: Position): string[];
  pointerChoicesAt?(parent: Position, tag: string): PointerCandidate[];
}

export interface CardView {
  setIcon(element: HTMLElement, icon: string): void;
  /** What the reader chose in the trees of the records shown, kept while the plugin is loaded. */
  session: TreeSession;
  /** Lists the fields of the standard, the ones with no room left disabled, below the pointer. */
  chooseField?(event: MouseEvent, fields: FieldChoice[]): void;
  choosePointer?(choices: PointerChoice[]): void;
  /** A toolbar the host keeps outside the card; the card makes its own when there is none. */
  header?: HTMLElement;
}

const FOCUS_KEY = "data-focus-key";
const TOGGLE_KEY = "tree:toggle";

const hasTree = (index: GenealogyIndex, record: string): boolean =>
  index.person(record) !== undefined || index.family(record) !== undefined || index.source(record) !== undefined;

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
  return media?.title ?? media?.file ?? placeAt(index, xref)?.name ?? t("desk.media");
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
  const focusWas = active !== null && (root.contains(active) || view.header?.contains(active)) ? active : null;
  const focusKey = focusWas?.closest(`[${FOCUS_KEY}]`)?.getAttribute(FOCUS_KEY) ?? null;
  const scrollTop = before?.scrollTop ?? 0;
  const previous = root.getAttribute("data-shown");
  for (const stale of [...root.children]) {
    if (stale !== live) {
      stale.remove();
    }
  }

  let drawsTree = false;
  const selection = tab?.selection() ?? { record: null };
  const index = tab?.index();
  const record = tab && index && selection.record && pageKind(index, selection.record) ? selection.record : null;
  const shown = tab && record ? `${tab.filePath() ?? ""}\n${record}` : "";

  const drawsTreeFor = Boolean(tab && index && record && hasTree(index, record));
  const header = view.header ?? (drawsTreeFor ? root.createDiv({ cls: ["gedcom-card-header", "nav-header"] }) : null);
  header?.empty();
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
    drawsTree = hasTree(index, record);
    drawRecord(body, tab, index, record, view, drawsTree ? { tree: view.session.stateFor(shown), ...(header ? { header } : {}) } : {});
    if (header && !header.hasChildNodes() && !view.header) {
      header.remove();
    }
  }

  if (view.header) {
    view.header.hidden = !view.header.hasChildNodes();
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
        : [...root.querySelectorAll<HTMLElement>(`[${FOCUS_KEY}]`), ...(view.header?.querySelectorAll<HTMLElement>(`[${FOCUS_KEY}]`) ?? [])].find((one) => one.getAttribute(FOCUS_KEY) === focusKey);
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
  view: CardView,
  folds: PersonPageOptions,
): void {
  const host: PageHost & { openFile(path: string): void } = {
    openRecord: (xref) => tab.select(xref),
    showInSource: (range) => tab.showInSource(range),
    openFile: (path) => tab.openFile(path),
    ...(view.choosePointer ? { choosePointer: (choices: PointerChoice[]) => view.choosePointer?.(choices) } : {}),
    ...(tab.pointerChoicesAt
      ? { pointerChoicesAt: (parent: Position, tag: string) => tab.pointerChoicesAt?.(parent, tag) ?? [] }
      : {}),
    ...(tab.choicesAt ? { choicesAt: (at: Position) => tab.choicesAt?.(at) ?? [] } : {}),
    ...(tab.addableAt ? { addableAt: (at: Position) => tab.addableAt?.(at) ?? [] } : {}),
    ...(view.chooseField ? { chooseField: (event: MouseEvent, fields: FieldChoice[]) => view.chooseField?.(event, fields) } : {}),
    setIcon: (element, icon) => view.setIcon(element, icon),
  };
  const person = index.person(record);
  const family = person ? undefined : index.family(record);
  const source = person || family ? undefined : index.source(record);
  const media = person || family || source ? undefined : index.media(record);
  const place = person || family || source || media ? undefined : placeAt(index, record);
  if (person) {
    renderPersonPage(body, person, index, folds, host);
  } else if (family) {
    renderFamilyPage(body, family, index, folds, host);
  } else if (source) {
    renderSourcePage(body, source, index, host, folds);
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
  }
}

function missingAt(at: Position): MediaItem {
  return { content: { kind: "missing", target: "" }, at };
}
