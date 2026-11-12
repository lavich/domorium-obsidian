import type {
  PointerCandidate,
  Position,
  Range,
  StructureFieldDescription,
  StructureInput,
  StructureValueInput,
} from "@domorium/language-service";

import type { GenealogyIndex, RecordLine } from "../genealogy";
import { t } from "../i18n";
import { renderFamilyPage } from "./familyPage";
import type { MediaItem } from "./media";
import { fileChoices, mediaFileEdit, type FileAt, type VaultFileChoice } from "./mediaFile";
import { HEADER_ID, pageKind } from "./deskState";
import { placeAt } from "./placeRows";
import { renderPlacePage } from "./placePage";
import { renderPersonPage, type PageHost, type PersonPageOptions } from "./personPage";
import { renderRecordPage } from "./recordPage";
import { renderSourcePage } from "./sourcePage";
import type { Choices } from "./addableFields";
import type { Refusal, WriteOutcome } from "./edits";
import type { FieldChoice, MenuAt, PointerChoice, TreeHost, ValueChoice } from "./detail/tree";
import { recordTitle } from "./detail/lineView";
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
  choicesAt?(at: Position): Choices | null;
  proseAt?(at: Position): boolean;
  holdsValueAt?(at: Position): boolean;
  removableAt?(parent: Position, tag: string): boolean;
  pointerChoicesAt?(parent: Position, tag: string): PointerCandidate[];
  pairedAt?(parent: Position, tag: string): boolean;
  requiredBeneath?(field: StructureFieldDescription): StructureFieldDescription[];
  checkValue?(at: Position, tag: string, input: StructureValueInput, replacing: boolean): Refusal | null;
  /** The version of the text the index was read from; every write the card asks for carries the one it was drawn at. */
  version?(): number;
  /** Whether the service describes the line at this position, so that the card may write to it. */
  describes?(at: Position): boolean;
  setValueAt?(at: Position, input: StructureValueInput, version: number): WriteOutcome;
  addAt?(parent: Position, tag: string, input: StructureInput, version: number): WriteOutcome;
  removeAt?(at: Position, nested: number, version: number, done: (outcome: WriteOutcome) => void): void;
  /** Draws every view of the tab again from its text, at once. */
  settle?(): void;
  vaultFiles?(): string[];
  vaultHas?(path: string): boolean;
  copyIntoVault?(path: string, data: ArrayBuffer): Promise<void>;
  fileEditAt?(at: FileAt, vaultPath: string, version: number, deviceType?: string): ReturnType<typeof mediaFileEdit>;
  writeFileAt?(at: FileAt, vaultPath: string, version: number, deviceType?: string): WriteOutcome;
}

export interface CardView {
  setIcon(element: HTMLElement, icon: string): void;
  /** What the reader chose in the trees of the records shown, kept while the plugin is loaded. */
  session: TreeSession;
  /** Lists the fields of the standard, the ones that cannot be added disabled. */
  chooseField?(at: MenuAt, fields: FieldChoice[]): void;
  chooseValues?(at: MenuAt, values: ValueChoice[]): void;
  choosePointer?(choices: PointerChoice[], chosen: (xref: string) => void): void;
  chooseVaultFile?(choices: VaultFileChoice[], chosen: (path: string) => void): void;
  chooseDeviceFile?(chosen: (file: File) => void): void;
  /** A toolbar the host keeps outside the card; the card makes its own when there is none. */
  header?: HTMLElement;
}

const FOCUS_KEY = "data-focus-key";
const TOGGLE_KEY = "tree:toggle";

const TREES: ReadonlySet<string> = new Set(["person", "family", "source", "media", "record"]);

const hasTree = (index: GenealogyIndex, record: string): boolean => TREES.has(pageKind(index, record) ?? "");

/** Nothing with an identifier: the header alone is nothing to show. */
const holdsNothing = (index: GenealogyIndex): boolean =>
  [index.people, index.families, index.sources].every((rows) => rows.every((row) => row.xref === undefined)) &&
  index.lists.media.length === 0 &&
  index.lists.notes.length === 0 &&
  index.lists.repositories.length === 0 &&
  index.lists.other.every((xref) => xref === HEADER_ID);

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
    body.createDiv({
      cls: "gedcom-desk-none gedcom-card-state",
      text: t(holdsNothing(index) ? "card.empty" : "card.nothing"),
    });
  } else {
    drawsTree = hasTree(index, record);
    const announce = (text: string): void => {
      live?.setText(text);
    };
    drawRecord(body, tab, index, record, view, announce, drawsTree ? { tree: view.session.stateFor(shown), ...(header ? { header } : {}) } : {});
    if (header && !header.hasChildNodes() && !view.header) {
      header.remove();
    }
  }

  if (view.header) {
    view.header.hidden = !view.header.hasChildNodes();
  }
  root.setAttribute("data-shown", shown);
  if (live && shown !== previous) {
    live.setText(tab && index && record ? t("card.announce", { name: recordTitle(index, record) ?? "" }) : "");
  }
  if (shown === previous) {
    body.scrollTop = scrollTop;
  }
  const drawnFocus = doc.activeElement;
  if (focusWas !== null && !(drawnFocus !== null && drawnFocus !== body && root.contains(drawnFocus))) {
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
  announce: (text: string) => void,
  folds: PersonPageOptions,
): void {
  const version = tab.version?.();
  const opening = index.record(record)?.range.start;
  const writes = version !== undefined && opening !== undefined && (tab.describes?.(opening) ?? false);
  const host: PageHost = {
    openRecord: (xref) => tab.select(xref),
    showInSource: (range) => tab.showInSource(range),
    openFile: (path) => tab.openFile(path),
    setIcon: (element, icon) => view.setIcon(element, icon),
    announce,
    addableAt: tab.addableAt?.bind(tab),
    choicesAt: tab.choicesAt?.bind(tab),
    proseAt: tab.proseAt?.bind(tab),
    holdsValueAt: tab.holdsValueAt?.bind(tab),
    removableAt: tab.removableAt?.bind(tab),
    pointerChoicesAt: tab.pointerChoicesAt?.bind(tab),
    pairedAt: tab.pairedAt?.bind(tab),
    requiredBeneath: tab.requiredBeneath?.bind(tab),
    checkValue: tab.checkValue?.bind(tab),
    chooseField: view.chooseField?.bind(view),
    chooseValues: view.chooseValues?.bind(view),
    choosePointer: view.choosePointer?.bind(view),
    uneditable: tab.setValueAt !== undefined && !writes,
    mediaFileAt: (line) => (line.valueAt === undefined ? null : tab.mediaItem(line.valueAt)),
  };
  if (writes) {
    const setValueAt = tab.setValueAt?.bind(tab);
    const addAt = tab.addAt?.bind(tab);
    const removeAt = tab.removeAt?.bind(tab);
    host.setValueAt = setValueAt && ((at, input) => setValueAt(at, input, version));
    host.addAt = addAt && ((parent, tag, input) => addAt(parent, tag, input, version));
    host.removeAt = removeAt && ((at, nested, done) => {
      removeAt(at, nested, version, done);
    });
    host.settle = tab.settle?.bind(tab);
    host.replaceFile = replacingFile(tab, view, version, host);
  }
  const person = index.person(record);
  const family = person ? undefined : index.family(record);
  const source = person || family ? undefined : index.source(record);
  const place = person || family || source ? undefined : placeAt(index, record);
  if (person) {
    renderPersonPage(body, person, index, folds, host);
  } else if (family) {
    renderFamilyPage(body, family, index, folds, host);
  } else if (source) {
    renderSourcePage(body, source, index, host, folds);
  } else if (place) {
    renderPlacePage(body, place, index, host);
  } else {
    renderRecordPage(body, record, index, host, folds);
  }
}

function replacingFile(tab: CardTab, view: CardView, version: number, host: TreeHost): TreeHost["replaceFile"] {
  const vaultFiles = tab.vaultFiles?.bind(tab);
  const vaultHas = tab.vaultHas?.bind(tab);
  const copyIntoVault = tab.copyIntoVault?.bind(tab);
  const fileEditAt = tab.fileEditAt?.bind(tab);
  const writeFileAt = tab.writeFileAt?.bind(tab);
  const chooseVaultFile = view.chooseVaultFile?.bind(view);
  const chooseDeviceFile = view.chooseDeviceFile?.bind(view);
  const chooseField = view.chooseField?.bind(view);
  const documentPath = tab.filePath();
  if (!vaultFiles || !vaultHas || !copyIntoVault || !fileEditAt || !writeFileAt || !chooseVaultFile || !chooseDeviceFile || !chooseField || documentPath === null) {
    return undefined;
  }
  return (at, line, done) => {
    const fileAt = fileLines(line);
    const choices = fileChoices(
      {
        documentPath,
        current: host.mediaFileAt?.(line)?.path,
        vaultFiles,
        taken: vaultHas,
        check: (vaultPath, deviceType) => {
          const answer = fileEditAt(fileAt, vaultPath, version, deviceType);
          return answer.ok ? null : answer;
        },
        write: (vaultPath, deviceType) => writeFileAt(fileAt, vaultPath, version, deviceType),
        copy: copyIntoVault,
        chooseVaultFile,
        chooseDeviceFile,
      },
      done,
    );
    chooseField(at, choices);
  };
}

function fileLines(line: RecordLine): FileAt {
  const file = line.range.start;
  const form = line.children.find((child) => child.tag === "FORM")?.range.start;
  return form === undefined ? { file } : { file, form };
}
