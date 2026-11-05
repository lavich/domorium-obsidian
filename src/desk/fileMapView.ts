import type { GenealogyIndex } from "../genealogy";
import { currentLanguage, plural, t } from "../i18n";
import { readBranchScope, sameBranch, type BranchScope } from "./branchScope";
import { defaultEnv, type FileMapHost, type MapEnv, type MapState, type TableState } from "./mapBoardTypes";
import { zoomControls } from "./dom";
import {
  fileMapOf,
  mapSelection,
  NO_ROUTE,
  orderedPlaces,
  placesWithoutRow,
  type FileMap,
  type MapEvent,
  type PlaceGroup,
  type Route,
} from "./fileMap";
import { GraphInput } from "./graphInput";
import { yearText } from "./labels";
import { collatorFor } from "./listRows";
import { emptyStateOf, MapEmpty } from "./mapEmpty";
import { activateGroup, activateMark, type ActionHost, nameOfMark } from "./mapActions";
import { MapFind } from "./mapFind";
import { markSelection, sliceRange, sliceScope } from "./mapScope";
import { MapScopeRow } from "./mapScopeRow";
import { MapGlide } from "./mapGlide";
import { handleKey, LiveRegion, placeAnnouncement } from "./mapKeys";
import { MapMarks } from "./mapMarks";
import {
  boundsOfPoints,
  CITY_ZOOM,
  clampView,
  fitView,
  limitsFor,
  MAX_TILE_ZOOM,
  type MapView,
  type SavedView,
  saveView,
  type Size,
  viewOf,
  centreOf,
} from "./mapProjection";
import { TileLayer } from "./mapTileLayer";
import { PlacePopup } from "./placePopup";
import { PlacesPanel, type PanelRow } from "./placesPanel";
import { YearChip } from "./yearChip";
import { least, most } from "./fileTimeline";
import { type YearRange } from "./yearRange";

export type { FileMapHost, MapEnv, MapState, TableState, TileSettings } from "./mapBoardTypes";
export { readMapState } from "./mapBoardTypes";

const SVG = "http://www.w3.org/2000/svg";
const FIT_PAD = 70;
const REPORT_MS = 300;
const ZOOM_STEP = 1.5;
const GLIDE_FROM_WORLD = 6;

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
  private readonly scopeRow: MapScopeRow;
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
  private readonly actions: ActionHost;

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
    this.scopeRow = new MapScopeRow(root, {
      setScope: (change) => this.setScope(change),
      showUnmapped: () => {
        this.panel.open();
        this.panel.scrollToUnmapped();
      },
      togglePanel: () => (this.panel.isOpen() ? this.panel.close() : this.panel.open()),
      setIcon: host.setIcon,
    });

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
      closed: () => this.scopeRow.focusCounter(),
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
    this.actions = {
      index: () => this.index,
      select: (xref) => this.host.select(xref),
      popup: this.popup,
      opener: this.plot,
      separate: (bounds) => {
        this.fitted = false;
        this.glideTo(fitView(bounds, this.size, FIT_PAD, MAX_TILE_ZOOM));
      },
    };
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

  dispose(): void {
    this.glide.stop();
    if (this.reportTimer !== null) {
      this.env.clear(this.reportTimer);
      this.reportTimer = null;
    }
    this.tiles.update({ x: 0, y: 0, k: 1 }, this.size, { enabled: false, template: null, attribution: "", maxZoom: MAX_TILE_ZOOM });
  }

  state(): MapState {
    const view = this.pendingSaved ?? (this.view && !this.fitted && this.size.width > 0 ? saveView(this.view, this.size) : null);
    return { ...this.scope, ...(view ? { view } : {}) };
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
    const slice = sliceScope(index, model, this.scope);
    this.scopeEv = slice.events;
    this.chip.setBounds(slice.bounds);
    this.recomputeRange();
  }

  private recomputeRange(): void {
    const model = this.model;
    if (model === null) {
      return;
    }
    ({ mapped: this.mapped, unmapped: this.unmapped } = sliceRange(model, this.scopeEv, this.range));
    this.recomputeSelection();
    this.drawScopeRow();
    this.drawPanel();
    this.find.refresh();
  }

  private recomputeSelection(): void {
    if (this.index === null || this.model === null) {
      return;
    }
    ({ highlighted: this.highlighted, route: this.route } = markSelection(this.index, this.model, this.selected, this.range));
  }

  private drawScopeRow(): void {
    if (this.index === null) {
      return;
    }
    this.scopeRow.draw({ index: this.index, scope: this.scope, selected: this.selected, mapped: this.mapped, unmapped: this.unmapped });
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
    this.scopeRow.say(text);
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
    this.tip.setText(nameOfMark(hit));
    this.tip.toggle(true);
    this.tip.setCssProps({ left: `${x + 14}px`, top: `${y + 14}px` });
  }

  private clicked(event: MouseEvent): void {
    if (this.input.swallows() || this.onControls(event.target)) {
      return;
    }
    const [x, y] = this.local(event);
    const hit = this.marks.hit(x, y, this.host.coarsePointer() || this.input.pointer === "touch");
    if (hit !== undefined) {
      activateMark(this.actions, hit, event);
    } else {
      this.popup.close(false);
    }
  }

  private activateKey(key: string): void {
    const group = this.mapped.find((one) => one.place.key === key);
    if (group === undefined) {
      return;
    }
    this.goToPlace(group, "focused");
    const box = this.plot.getBoundingClientRect();
    activateGroup(this.actions, group, { clientX: box.left + this.size.width / 2, clientY: box.top + this.size.height / 2 });
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
          activateGroup(this.actions, group, { clientX: box.left + this.size.width / 2, clientY: box.top + this.size.height / 2 });
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

