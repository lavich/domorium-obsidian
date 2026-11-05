import type { GenealogyIndex } from "../genealogy";
import { currentLanguage, plural, t } from "../i18n";
import { BranchScopeBar, readBranchScope, sameBranch, type BranchScope } from "./branchScope";
import { type IconSetter, prefersReducedMotion, zoomControls } from "./dom";
import {
  branchOf,
  fileMapOf,
  groupByPlace,
  mapSelection,
  NO_ROUTE,
  orderedPlaces,
  placesWithoutRow,
  recordEvents,
  routeOf,
  scopeEvents,
  type FileMap,
  type MapEvent,
  type PlaceGroup,
  type Route,
} from "./fileMap";
import { GraphInput } from "./graphInput";
import { familyTitle, personName, yearText } from "./labels";
import { collatorFor } from "./listRows";
import { emptyStateOf, MapEmpty } from "./mapEmpty";
import { MapFind } from "./mapFind";
import { MapGlide } from "./mapGlide";
import { handleKey, LiveRegion, placeAnnouncement } from "./mapKeys";
import { clusterName, type DrawnMark, MapMarks } from "./mapMarks";
import { decodeOutline, outlinePath } from "./mapOutline";
import { MAP_OUTLINE } from "./mapOutlineData";
import {
  boundsOfPoints,
  CITY_ZOOM,
  clampView,
  fitView,
  limitsFor,
  MAX_TILE_ZOOM,
  type MapView,
  type SavedView,
  readMapView,
  saveView,
  type Size,
  viewOf,
  centreOf,
} from "./mapProjection";
import { TileLayer } from "./mapTileLayer";
import { PlacePopup, popupRows } from "./placePopup";
import { placeKey, type PlacesTable } from "./placesTable";
import { PlacesPanel, type PanelRow } from "./placesPanel";
import { YearChip } from "./yearChip";
import { least, most } from "./fileTimeline";
import { boundsOf, keeps, type YearRange } from "./yearRange";

export interface MapState extends BranchScope {
  view?: SavedView;
}

export type TableState = { status: "unread" } | { status: "absent" } | { status: "read"; table: PlacesTable };

export interface TileSettings {
  enabled: boolean;
  template: string | null;
  invalid: boolean;
  attribution: string;
}

export interface FileMapHost {
  select(xref: string): void;
  setIcon: IconSetter;
  coarsePointer(): boolean;
  stateChanged(state: MapState): void;
  tableAction(): void;
  addMissing(names: string[]): void;
  tiles(): TileSettings;
}

export interface MapEnv {
  frame(callback: () => void): number;
  cancel(id: number): void;
  now(): number;
  set(callback: () => void, ms: number): number;
  clear(id: number): void;
  reduced(): boolean;
  outline(): string;
}

const SVG = "http://www.w3.org/2000/svg";
const FIT_PAD = 70;
const REPORT_MS = 300;
const ZOOM_STEP = 1.5;
const GLIDE_FROM_WORLD = 6;

let outlineCache: string | null = null;

function defaultEnv(doc: Document): MapEnv {
  const win = doc.defaultView ?? window;
  return {
    frame: (callback) => win.requestAnimationFrame(callback),
    cancel: (id) => win.cancelAnimationFrame(id),
    now: () => win.performance.now(),
    set: (callback, ms) => win.setTimeout(callback, ms),
    clear: (id) => win.clearTimeout(id),
    reduced: () => prefersReducedMotion(doc),
    outline: () => (outlineCache ??= outlinePath(decodeOutline(MAP_OUTLINE))),
  };
}

export function readMapState(state: unknown): MapState {
  const raw = typeof state === "object" && state !== null ? (state as Record<string, unknown>) : {};
  const view = readMapView(raw.view);
  return { ...readBranchScope(raw), ...(view ? { view } : {}) };
}

function svg<K extends keyof SVGElementTagNameMap>(tag: K, parent: Element, cls?: string): SVGElementTagNameMap[K] {
  const made = parent.ownerDocument.createElementNS(SVG, tag);
  if (cls) {
    made.setAttribute("class", cls);
  }
  parent.append(made);
  return made;
}

export class MapBoard {
  private readonly env: MapEnv;
  private readonly plot: HTMLElement;
  private readonly baseEl: SVGGElement;
  private readonly scopeBar: BranchScopeBar;
  private readonly branchButton: HTMLButtonElement;
  private readonly countsEl: HTMLElement;
  private readonly counterEl: HTMLButtonElement;
  private readonly statusEl: HTMLElement;
  private readonly tip: HTMLElement;
  private readonly credit: HTMLElement;
  private readonly live: LiveRegion;
  private readonly marks: MapMarks;
  private readonly glide: MapGlide;
  private readonly input: GraphInput;
  private readonly tiles: TileLayer;
  private readonly chip: YearChip;
  private readonly find: MapFind;
  private readonly popup: PlacePopup;
  private readonly panel: PlacesPanel;
  private readonly empty: MapEmpty;
  private readonly textProbe: SVGTextElement;
  private readonly widths = new Map<string, number>();

  private index: GenealogyIndex | null = null;
  private tableState: TableState = { status: "unread" };
  private model: FileMap | null = null;
  private scope: BranchScope = { up: 2, down: 2 };
  private range: YearRange | null = null;
  private selected: string | null = null;
  private highlighted = new Set<string>();
  private route: Route = NO_ROUTE;
  private scopeEv: MapEvent[] = [];
  private mapped: PlaceGroup[] = [];
  private unmapped: PlaceGroup[] = [];
  private view: MapView | null = null;
  private size: Size = { width: 0, height: 0 };
  private fitted = true;
  private matches: ReadonlySet<string> | null = null;
  private current: string | null = null;
  private focusedKey: string | null = null;
  private tilesFailed = false;
  private findNote = "";
  private reportTimer: number | null = null;
  private lastInputs = "";
  private pendingSaved: SavedView | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly host: FileMapHost,
    env?: Partial<MapEnv>,
  ) {
    this.env = { ...defaultEnv(root.ownerDocument), ...env };
    root.addClass("gedcom-map");
    const row = root.createDiv({ cls: "gedcom-map-scope-row" });
    this.scopeBar = new BranchScopeBar(row, {
      prefix: "gedcom-map",
      setIcon: host.setIcon,
      change: (change) => this.setScope(change),
    });
    this.branchButton = row.createEl("button", { cls: "gedcom-map-branch", attr: { type: "button" } });
    this.branchButton.addEventListener("click", () => {
      if (this.selected !== null && this.index?.person(this.selected)) {
        this.setScope({ focus: this.selected });
      }
    });
    this.countsEl = row.createSpan({ cls: "gedcom-map-counts" });
    this.counterEl = row.createEl("button", { cls: "gedcom-map-counter", attr: { type: "button" } });
    this.counterEl.addEventListener("click", () => {
      this.panel.open();
      this.panel.scrollToUnmapped();
    });
    const toggle = row.createEl("button", { cls: "gedcom-map-panel-toggle", text: t("map.panel.open"), attr: { type: "button" } });
    toggle.addEventListener("click", () => (this.panel.isOpen() ? this.panel.close() : this.panel.open()));
    this.statusEl = row.createSpan({ cls: "gedcom-map-status", attr: { "aria-live": "polite" } });

    const stage = root.createDiv({ cls: "gedcom-map-stage" });
    this.plot = stage.createDiv({ cls: "gedcom-map-plot", attr: { tabindex: "0", role: "group" } });
    const tileLayer = this.plot.createDiv({ cls: "gedcom-map-tiles" });
    const canvas = svg("svg", this.plot, "gedcom-map-svg");
    this.baseEl = svg("g", canvas, "gedcom-map-base");
    svg("path", this.baseEl, "gedcom-map-land").setAttribute("d", this.env.outline());
    this.marks = new MapMarks({ route: svg("g", canvas, "gedcom-map-route"), marks: svg("g", canvas, "gedcom-map-marks"), labels: svg("g", canvas, "gedcom-map-labels") });
    this.textProbe = svg("text", canvas, "gedcom-map-label gedcom-map-probe");
    canvas.setAttribute("aria-hidden", "true");

    this.find = new MapFind(this.plot, {
      groups: () => [...this.mapped, ...this.unmapped],
      collator: () => collatorFor(currentLanguage()),
      matchesChanged: (keys) => {
        this.matches = keys;
        this.draw();
      },
      goTo: (group) => this.goToPlace(group, "current"),
      cleared: () => {
        this.current = null;
        this.draw();
      },
      note: (text) => {
        this.findNote = text;
        this.drawStatus();
      },
      setIcon: host.setIcon,
    });
    zoomControls(this.plot, "gedcom-map", host.setIcon, {
      out: () => this.zoomBy(1 / ZOOM_STEP),
      in: () => this.zoomBy(ZOOM_STEP),
      fit: () => this.fit(true),
    });
    this.chip = new YearChip(this.plot, { changed: (range) => this.rangeChanged(range) });
    this.credit = this.plot.createDiv({ cls: "gedcom-map-credit" });
    this.credit.toggle(false);
    this.tip = this.plot.createDiv({ cls: "gedcom-map-tip" });
    this.tip.toggle(false);
    this.live = new LiveRegion(this.plot);
    this.popup = new PlacePopup(this.plot, { select: (xref) => this.host.select(xref), closed: () => undefined });
    this.empty = new MapEmpty(this.plot, () => this.host.tableAction());
    this.panel = new PlacesPanel(stage, {
      activate: (key) => this.activateKey(key),
      tableAction: () => this.host.tableAction(),
      addMissing: () => this.host.addMissing(this.missingNames()),
      closed: () => this.counterEl.focus({ preventScroll: true }),
    });
    this.tiles = new TileLayer(tileLayer, this.credit, { status: (failed) => this.tileStatus(failed) }, {
      set: (callback, ms) => this.env.set(callback, ms),
      clear: (id) => this.env.clear(id),
      now: () => this.env.now(),
    });
    this.glide = new MapGlide((view) => this.setView(view, false), {
      size: () => this.size,
      now: () => this.env.now(),
      frame: (callback) => this.env.frame(callback),
      cancel: (id) => this.env.cancel(id),
      reduced: () => this.env.reduced(),
    });
    this.input = new GraphInput({
      el: this.plot,
      transform: () => this.view,
      apply: (at) => {
        this.glide.stop();
        this.setView(at, true);
      },
      limits: () => this.limits(),
      stopGlide: () => this.glide.stop(),
      zoomAt: (factor, cx, cy) => this.zoomAt(factor, cx, cy),
      panBy: (dx, dy) => {
        this.glide.stop();
        if (this.view) {
          this.setView({ ...this.view, x: this.view.x + dx, y: this.view.y + dy }, true);
        }
      },
      hideTip: () => this.tip.toggle(false),
      onControls: (target) => this.onControls(target),
      hovered: (event) => this.hovered(event),
      left: () => this.tip.toggle(false),
    });
    this.input.listen();
    this.plot.addEventListener("click", (event) => this.clicked(event));
    this.plot.addEventListener("keydown", (event) => this.keyed(event));
    this.drawScopeRow();
  }

  show(index: GenealogyIndex, table: TableState, state: MapState): void {
    const sameIndex = this.index === index;
    const inputs = JSON.stringify([table.status, state.focus, state.up, state.down]);
    const tableChanged = JSON.stringify(this.tableState) !== JSON.stringify(table) || (table.status === "read" && this.tableState.status === "read" && table.table !== this.tableState.table);
    if (sameIndex && !tableChanged && inputs === this.lastInputs) {
      this.resized();
      return;
    }
    this.lastInputs = inputs;
    this.index = index;
    this.tableState = table;
    const wasEmpty = this.model === null;
    this.scope = { ...readBranchScope(state) };
    if (this.scope.focus !== undefined && !index.person(this.scope.focus)) {
      delete this.scope.focus;
    }
    this.model = fileMapOf(index, table.status === "read" ? table.table : { rows: new Map() });
    this.recompute();
    if (wasEmpty && state.view !== undefined && this.size.width > 0) {
      this.view = clampView(viewOf(state.view, this.size), this.size, this.limits());
      this.fitted = false;
    } else if (wasEmpty) {
      this.pendingSaved = state.view ?? null;
      this.fitted = state.view === undefined;
    }
    this.refit(false);
    this.draw();
  }


  select(xref: string | null, reveal: boolean): void {
    this.selected = this.index === null ? null : mapSelection(this.index, xref);
    this.recomputeSelection();
    if (reveal && this.highlighted.size > 0 && this.size.width > 0) {
      const target = this.holdingView(this.highlighted);
      if (target !== null) {
        this.fitted = false;
        this.glideTo(target);
      }
    }
    this.drawScopeRow();
    this.drawStatus();
    this.draw();
  }

  openSearch(): void {
    this.find.open();
  }

  resized(size?: Size): void {
    const next = size ?? { width: this.plot.clientWidth, height: this.plot.clientHeight };
    if (next.width <= 0 || next.height <= 0 || (next.width === this.size.width && next.height === this.size.height)) {
      return;
    }
    const before = this.view;
    const previous = this.size;
    this.size = next;
    if (this.pendingSaved !== null) {
      this.view = clampView(viewOf(this.pendingSaved, next), next, this.limits());
      this.pendingSaved = null;
      this.fitted = false;
    } else if (before === null || this.fitted) {
      this.refit(false);
    } else {
      this.view = clampView(viewOf(centreOf(before, previous), next), next, this.limits());
    }
    this.draw();
  }

  cancelHover(): void {
    this.tip.toggle(false);
  }

  state(): MapState {
    const scope = { ...this.scope };
    return { ...scope, ...(this.view && !this.fitted && this.size.width > 0 ? { view: saveView(this.view, this.size) } : {}) };
  }

  tilesChanged(): void {
    this.draw();
    this.drawStatus();
  }

  private limits() {
    const tiles = this.host.tiles();
    return limitsFor(this.size, tiles.enabled && tiles.template !== null);
  }

  private setView(view: MapView, user: boolean): void {
    this.view = clampView(view, this.size, this.limits());
    if (user) {
      this.fitted = false;
      this.reportSoon();
    }
    this.popup.close(false);
    this.draw();
  }

  private zoomAt(factor: number, cx: number, cy: number): void {
    this.glide.stop();
    const view = this.view;
    if (view === null) {
      return;
    }
    const limits = this.limits();
    const k = Math.min(limits.max, Math.max(limits.min, view.k * factor));
    this.setView({ x: cx - ((cx - view.x) * k) / view.k, y: cy - ((cy - view.y) * k) / view.k, k }, true);
  }

  private zoomBy(factor: number): void {
    const view = this.view;
    if (view === null) {
      return;
    }
    const limits = this.limits();
    const k = Math.min(limits.max, Math.max(limits.min, view.k * factor));
    const [cx, cy] = [this.size.width / 2, this.size.height / 2];
    this.fitted = false;
    this.glideTo({ x: cx - ((cx - view.x) * k) / view.k, y: cy - ((cy - view.y) * k) / view.k, k });
  }

  private glideTo(target: MapView): void {
    if (this.view === null) {
      this.setView(target, false);
      return;
    }
    this.glide.to(this.view, clampView(target, this.size, this.limits()));
    this.reportSoon();
  }

  private holdingView(keys: ReadonlySet<string>): MapView | null {
    const points = this.mapped.flatMap((group) =>
      keys.has(group.place.key) && group.place.coordinates ? [{ lat: group.place.coordinates.latitude, lon: group.place.coordinates.longitude }] : [],
    );
    return points.length === 0 ? null : fitView(boundsOfPoints(points), this.size, FIT_PAD, CITY_ZOOM);
  }

  private fit(glide: boolean): void {
    this.fitted = true;
    this.refit(glide);
    this.reportSoon();
  }

  private refit(glide: boolean): void {
    if (this.size.width <= 0 || !this.fitted) {
      return;
    }
    const points = this.mapped.flatMap((group) => (group.place.coordinates ? [{ lat: group.place.coordinates.latitude, lon: group.place.coordinates.longitude }] : []));
    const target = clampView(fitView(boundsOfPoints(points), this.size, FIT_PAD, CITY_ZOOM), this.size, this.limits());
    if (glide && this.view !== null) {
      this.glide.to(this.view, target);
    } else {
      this.view = target;
    }
  }

  private setScope(change: Partial<BranchScope>): void {
    const next: BranchScope = { ...this.scope, ...change };
    if (!next.focus) {
      delete next.focus;
    }
    if (sameBranch(next, this.scope)) {
      return;
    }
    this.scope = next;
    this.recompute();
    this.fitted = true;
    this.refit(true);
    this.draw();
    this.host.stateChanged(this.state());
  }

  private rangeChanged(range: YearRange | null): void {
    this.range = range;
    this.recomputeRange();
    this.draw();
  }

  private recompute(): void {
    const index = this.index;
    const model = this.model;
    if (index === null || model === null) {
      return;
    }
    const branch = this.scope.focus === undefined ? null : branchOf(index, this.scope.focus, this.scope.up, this.scope.down);
    this.scopeEv = scopeEvents(model, index, branch);
    const mappedEvents = this.scopeEv.filter((event) => model.places.get(placeKey(event.place))?.coordinates !== undefined);
    this.chip.setBounds(boundsOf(mappedEvents));
    this.recomputeRange();
    this.recomputeSelection();
    this.drawScopeRow();
  }

  private recomputeRange(): void {
    const model = this.model;
    if (model === null) {
      return;
    }
    const kept = this.scopeEv.filter((event) => keeps(event, this.range));
    const groups = groupByPlace(model, kept);
    this.mapped = groups.filter((group) => group.place.coordinates !== undefined);
    this.unmapped = groupByPlace(model, this.scopeEv).filter((group) => group.place.coordinates === undefined);
    this.recomputeSelection();
    this.drawScopeRow();
    this.drawPanel();
    this.find.refresh();
  }

  private recomputeSelection(): void {
    const index = this.index;
    const model = this.model;
    this.highlighted = new Set();
    if (index === null || model === null || this.selected === null) {
      this.route = NO_ROUTE;
      return;
    }
    const keep = (event: MapEvent): boolean => keeps(event, this.range);
    for (const event of recordEvents(model, index, this.selected)) {
      const place = model.places.get(placeKey(event.place));
      if (place?.coordinates !== undefined && keep(event)) {
        this.highlighted.add(place.key);
      }
    }
    this.route = routeOf(model, index, this.selected, keep);
  }

  private drawScopeRow(): void {
    const index = this.index;
    if (index === null) {
      return;
    }
    const focus = this.scope.focus === undefined ? undefined : index.person(this.scope.focus);
    this.scopeBar.draw(this.scope, {
      total: index.people.length,
      shown: this.scope.focus === undefined ? 0 : branchOf(index, this.scope.focus, this.scope.up, this.scope.down).size,
      focusName: focus ? personName(focus) : null,
    });
    const person = this.selected === null ? undefined : index.person(this.selected);
    this.branchButton.toggle(this.scope.focus === undefined);
    this.branchButton.setText(person ? t("map.branch", { name: personName(person) }) : t("overview.branch"));
    this.branchButton.disabled = person === undefined;
    const events = this.mapped.reduce((sum, group) => sum + group.events.length, 0);
    this.countsEl.setText(`${plural("map.places", this.mapped.length)} · ${plural("map.events", events)}`);
    this.counterEl.toggle(this.unmapped.length > 0);
    this.counterEl.setText(plural("map.noCoordinates", this.unmapped.length));
    this.plot.setAttribute("aria-label", plural("map.label", this.mapped.length));
  }

  private drawStatus(): void {
    const tiles = this.host.tiles();
    const text =
      this.tilesFailed && tiles.enabled
        ? t("map.tiles.failed")
        : tiles.enabled && tiles.invalid
          ? t("map.tiles.invalid")
          : this.selected !== null && this.highlighted.size === 0
            ? t("map.status.noSelectionPlaces")
            : this.findNote;
    this.statusEl.setText(text);
  }

  private tileStatus(failed: boolean): void {
    this.tilesFailed = failed;
    this.drawStatus();
  }

  private missingNames(): string[] {
    return this.tableState.status === "read" ? placesWithoutRow(this.unmapped, this.tableState.table) : [];
  }

  private drawPanel(): void {
    const collator = collatorFor(currentLanguage());
    const row = (group: PlaceGroup, mapped: boolean): PanelRow => ({
      key: group.place.key,
      name: group.place.name,
      events: group.events.length,
      years: yearsOf(group.events),
      mapped,
    });
    this.panel.show({
      mapped: orderedPlaces(this.mapped, collator).map((group) => row(group, true)),
      unmapped: orderedPlaces(this.unmapped, collator).map((group) => row(group, false)),
      table: this.tableState.status === "read" ? "open" : "create",
      missing: this.tableState.status === "read" ? this.missingNames().length : 0,
    });
    this.empty.show(
      emptyStateOf({
        read: this.tableState.status !== "unread",
        places: this.model?.places.size ?? 0,
        mapped: this.mapped.length,
        tableExists: this.tableState.status === "read",
      }),
    );
  }

  private measure = (text: string): number => {
    const held = this.widths.get(text);
    if (held !== undefined) {
      return held;
    }
    this.textProbe.textContent = text;
    const measured = this.textProbe.getComputedTextLength?.() ?? 0;
    const width = measured > 0 ? measured : text.length * 6.5;
    this.widths.set(text, width);
    return width;
  };

  private draw(): void {
    const view = this.view;
    if (view === null || this.size.width <= 0 || this.index === null) {
      return;
    }
    this.baseEl.setAttribute("transform", `translate(${view.x} ${view.y}) scale(${view.k})`);
    this.marks.draw({
      view,
      size: this.size,
      coarse: this.host.coarsePointer(),
      groups: this.mapped,
      highlighted: this.highlighted,
      selected: this.selected !== null,
      route: this.route,
      current: this.current,
      focused: this.focusedKey,
      matches: this.matches,
      measure: this.measure,
    });
    const tiles = this.host.tiles();
    this.tiles.update(view, this.size, { enabled: tiles.enabled, template: tiles.template, attribution: tiles.attribution, maxZoom: MAX_TILE_ZOOM });
    this.plot.classList.toggle("is-tiles", tiles.enabled && tiles.template !== null);
  }

  private reportSoon(): void {
    if (this.reportTimer !== null) {
      this.env.clear(this.reportTimer);
    }
    this.reportTimer = this.env.set(() => {
      this.reportTimer = null;
      this.host.stateChanged(this.state());
    }, REPORT_MS);
  }

  private onControls(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest(".gedcom-map-controls, .gedcom-map-years, .gedcom-map-find, .gedcom-map-popup, .gedcom-map-empty, .gedcom-map-credit") !== null;
  }

  private local(event: { clientX: number; clientY: number }): [number, number] {
    const box = this.plot.getBoundingClientRect();
    return [event.clientX - box.left, event.clientY - box.top];
  }

  private hovered(event: PointerEvent): void {
    if (event.pointerType === "touch") {
      return;
    }
    const [x, y] = this.local(event);
    const hit = this.marks.hit(x, y, false);
    if (hit === undefined) {
      this.tip.toggle(false);
      return;
    }
    this.tip.setText(this.nameOfMark(hit));
    this.tip.toggle(true);
    this.tip.setCssProps({ left: `${x + 14}px`, top: `${y + 14}px` });
  }

  private nameOfMark(mark: DrawnMark): string {
    if (mark.kind === "cluster") {
      return clusterName(mark.groups.length, mark.groups.reduce((sum, group) => sum + group.events.length, 0), [...mark.groups].sort((a, b) => b.events.length - a.events.length).slice(0, 3).map((group) => group.place.name));
    }
    const group = mark.groups[0];
    return group === undefined ? "" : t("map.place.tip", { name: group.place.name, events: plural("map.events", group.events.length) });
  }

  private clicked(event: MouseEvent): void {
    if (this.input.swallows() || this.onControls(event.target)) {
      return;
    }
    const [x, y] = this.local(event);
    const hit = this.marks.hit(x, y, this.host.coarsePointer() || this.input.pointer === "touch");
    if (hit !== undefined) {
      this.activate(hit, event);
    } else {
      this.popup.close(false);
    }
  }

  private activate(mark: DrawnMark, at: { clientX: number; clientY: number }): void {
    if (mark.kind === "cluster") {
      const points = mark.members.map((one) => ({ lat: one.lat, lon: one.lon }));
      const separates = mark.members.some((one) => one.lat !== mark.members[0]?.lat || one.lon !== mark.members[0]?.lon);
      if (separates) {
        this.fitted = false;
        this.glideTo(fitView(boundsOfPoints(points), this.size, FIT_PAD, MAX_TILE_ZOOM));
      } else {
        this.openPopup(mark.groups, at);
      }
      return;
    }
    const [group] = mark.groups;
    if (group !== undefined) {
      this.activateGroup(group, at);
    }
  }

  private activateGroup(group: PlaceGroup, at: { clientX: number; clientY: number }): void {
    const records = [...new Set(group.events.map((event) => event.record))];
    const [only] = records;
    if (records.length === 1 && only !== undefined) {
      this.host.select(only);
    } else {
      this.openPopup([group], at);
    }
  }

  private openPopup(groups: readonly PlaceGroup[], at: { clientX: number; clientY: number }): void {
    const index = this.index;
    if (index === null) {
      return;
    }
    const nameOf = (record: string): string => {
      const person = index.person(record);
      const family = index.family(record);
      return person ? personName(person) : family ? familyTitle(family.spouseNames) : record;
    };
    this.popup.open(
      groups.map((group) => group.place.name).join(", "),
      groups.map((group) => ({ ...(groups.length > 1 ? { place: group.place.name } : {}), rows: popupRows(group.events, nameOf) })),
      at,
      this.plot,
    );
  }

  private activateKey(key: string): void {
    const group = this.mapped.find((one) => one.place.key === key);
    if (group === undefined) {
      return;
    }
    this.goToPlace(group, "focused");
    const box = this.plot.getBoundingClientRect();
    this.activateGroup(group, { clientX: box.left + this.size.width / 2, clientY: box.top + this.size.height / 2 });
  }

  private goToPlace(group: PlaceGroup, as: "current" | "focused"): void {
    const at = group.place.coordinates;
    if (at === undefined || this.view === null) {
      return;
    }
    if (as === "current") {
      this.current = group.place.key;
    } else {
      this.focusedKey = group.place.key;
    }
    const zoom = Math.log2(this.view.k);
    const target = viewOf({ lat: at.latitude, lon: at.longitude, zoom: zoom < GLIDE_FROM_WORLD ? CITY_ZOOM : zoom }, this.size);
    this.fitted = false;
    this.glideTo(target);
    this.live.say(this.announce(group));
    this.draw();
  }

  private announce(group: PlaceGroup): string {
    const years = group.events.flatMap((event) => event.span ?? []);
    return placeAnnouncement(group.place.name, group.events.length, years.length === 0 ? null : { from: least(years), to: most(years) });
  }

  private keyed(event: KeyboardEvent): void {
    if (event.target !== this.plot) {
      return;
    }
    const ordered = orderedPlaces(this.mapped, collatorFor(currentLanguage()));
    const at = ordered.findIndex((group) => group.place.key === this.focusedKey);
    const go = (to: number): void => {
      const group = ordered[Math.max(0, Math.min(ordered.length - 1, to))];
      if (group !== undefined) {
        this.goToPlace(group, "focused");
      }
    };
    const handled = handleKey(event, {
      step: (by) => go(at < 0 ? (by > 0 ? 0 : ordered.length - 1) : at + by),
      edge: (which) => go(which === "first" ? 0 : ordered.length - 1),
      activate: () => {
        const group = ordered[at];
        if (group !== undefined) {
          const box = this.plot.getBoundingClientRect();
          this.activateGroup(group, { clientX: box.left + this.size.width / 2, clientY: box.top + this.size.height / 2 });
        }
      },
      zoom: (direction) => this.zoomBy(direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP),
      fit: () => this.fit(true),
      closePopup: () => {
        if (!this.popup.isOpen()) {
          return false;
        }
        this.popup.close();
        return true;
      },
    });
    if (handled) {
      event.preventDefault();
    }
  }
}

function yearsOf(events: readonly MapEvent[]): string {
  const years = events.flatMap((event) => event.span ?? []);
  if (years.length === 0) {
    return "";
  }
  const [from, to] = [least(years), most(years)];
  return from === to ? yearText(from) : `${yearText(from)}–${yearText(to)}`;
}

