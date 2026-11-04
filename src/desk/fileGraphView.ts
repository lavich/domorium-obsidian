import { plural, t } from "../i18n";
import { BranchScopeBar, readBranchScope, sameBranch, type BranchScope } from "./branchScope";
import { fileGraphOf } from "./fileGraph";
import type { FileTimeline } from "./fileTimeline";
import {
  GraphCanvas,
  zoomButtons,
  ZOOM,
  type CanvasScene,
  type GraphView,
  type GraphWindow,
  type Opening,
  type PortraitContent,
} from "./graphCanvas";
import { familyTitle, lifelineYears, personName } from "./labels";

export { curve, fitText, ZOOM, type GraphView, type GraphWindow } from "./graphCanvas";


export interface GraphState extends BranchScope {
  gedcom: string | null;
  /** The person of the tab the graph was opened from. */
  around?: string;
  view?: GraphView;
}

export interface GraphSettings {
  scope: BranchScope;
  around?: string;
  view?: GraphView;
}

export interface FileGraphHost {
  /** A person or a family. */
  openRecord(xref: string): void;
  /** `view` is absent until the canvas has had a size. */
  stateChanged(settings: { scope: BranchScope; view?: GraphView }): void;
  setIcon(element: HTMLElement, icon: string): void;
  /** The picture the person's page shows, where it can be shown. */
  portrait?(xref: string): PortraitContent | null;
}

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function readGraphState(state: unknown): GraphState {
  const raw = typeof state === "object" && state !== null ? (state as Record<string, unknown>) : {};
  const view = typeof raw.view === "object" && raw.view !== null ? (raw.view as Record<string, unknown>) : null;
  return {
    gedcom: typeof raw.gedcom === "string" && raw.gedcom ? raw.gedcom : null,
    ...readBranchScope(raw),
    ...(typeof raw.around === "string" && raw.around ? { around: raw.around } : {}),
    ...(view && finite(view.x) && finite(view.y) && finite(view.k)
      ? { view: { x: view.x, y: view.y, k: Math.min(ZOOM.max, Math.max(ZOOM.min, view.k)) } }
      : {}),
  };
}

/** The graph of a file: its header, search, scope bar and legend around a canvas. */
export class FileGraphBoard {
  private readonly root: HTMLElement;
  private readonly title: HTMLElement;
  private readonly summary: HTMLElement;
  private readonly searchInput: HTMLInputElement;
  private readonly scopeBar: BranchScopeBar;
  private readonly canvas: GraphCanvas;
  private readonly goneEl: HTMLElement;
  private model: FileTimeline | null = null;
  private scope: BranchScope = readBranchScope(null);
  private shown: unknown = null;

  constructor(
    parent: HTMLElement,
    private readonly host: FileGraphHost,
  ) {
    this.root = parent.createDiv({ cls: "gedcom-fg" });
    const head = this.root.createDiv({ cls: "gedcom-fg-head" });
    this.title = head.createDiv({ cls: "gedcom-fg-title" });
    this.summary = head.createDiv({ cls: "gedcom-fg-summary" });

    const tools = this.root.createDiv({ cls: "gedcom-fg-tools" });
    this.searchInput = tools.createEl("input", {
      cls: "gedcom-fg-search",
      type: "search",
      placeholder: t("overview.search"),
      attr: { "aria-label": t("overview.search") },
    });
    const zoom = tools.createDiv({ cls: "gedcom-fg-zoom" });
    this.scopeBar = new BranchScopeBar(this.root, {
      prefix: "gedcom-fg",
      setIcon: (element, icon) => this.host.setIcon(element, icon),
      change: (next) => this.setScope(next),
    });
    this.canvas = new GraphCanvas(this.root, {
      activateCard: (xref) => this.host.openRecord(xref),
      activateFamily: (xref) => this.host.openRecord(xref),
      branch: (xref) => this.setScope({ focus: xref === this.scope.focus ? undefined : xref }),
      viewChanged: (view) => this.host.stateChanged({ scope: scopeOf(this.scope), view }),
    });
    zoomButtons(zoom, this.canvas, (element, icon) => this.host.setIcon(element, icon));
    this.legend(this.root.createDiv({ cls: "gedcom-fg-legend" }));
    this.goneEl = this.root.createDiv({ cls: "gedcom-fg-gone" });
    this.goneEl.toggle(false);

    this.searchInput.addEventListener("input", () => this.canvas.setQuery(this.searchInput.value));
    this.searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.canvas.nextMatch();
      }
    });
  }

  show(model: FileTimeline, fileName: string, settings: GraphSettings): void {
    this.goneEl.toggle(false);
    this.root.removeClass("is-gone");
    this.title.setText(t("fileGraph.title", { name: fileName }));
    const scope = scopeOf(settings.scope);
    const first = this.model === null;
    const scoped = !sameBranch(scope, this.scope);
    if (!first && !scoped && model === this.model) {
      return;
    }
    const opening: Opening | null = first
      ? settings.view
        ? { saved: settings.view }
        : { open: settings.around }
      : scoped
        ? { centre: scope.focus ?? this.scope.focus }
        : null;
    this.model = model;
    this.scope = scope;
    this.summary.setText(
      [plural("overview.people", model.people.size), plural("overview.families", model.families.size)].join(" · "),
    );
    this.relayout(opening);
  }

  /** Where the file is gone, the last reading stays out of sight rather than passing for the file. */
  showGone(path: string): void {
    this.root.addClass("is-gone");
    this.goneEl.toggle(true);
    this.goneEl.setText(t("overview.gone", { path }));
  }

  resized(size?: { width: number; height: number }): void {
    this.canvas.resized(size);
  }

  view(): GraphView | null {
    return this.canvas.view();
  }

  windowOf(): GraphWindow | null {
    return this.canvas.windowOf();
  }

  needsDraw(window: GraphWindow): boolean {
    return this.canvas.needsDraw(window);
  }

  draw(window: GraphWindow): void {
    this.canvas.draw(window);
  }

  highlight(xref: string | null): void {
    this.canvas.highlight(xref);
  }

  setQuery(query: string): void {
    this.canvas.setQuery(query);
  }

  nextMatch(): string | null {
    return this.canvas.nextMatch();
  }

  zoomAt(factor: number, cx: number, cy: number): void {
    this.canvas.zoomAt(factor, cx, cy);
  }

  zoomBy(factor: number): void {
    this.canvas.zoomBy(factor);
  }

  fit(): void {
    this.canvas.fit();
  }

  panBy(dx: number, dy: number): void {
    this.canvas.panBy(dx, dy);
  }

  private setScope(change: Partial<BranchScope>): void {
    const next: BranchScope = { ...this.scope, ...change };
    if (!next.focus) {
      delete next.focus;
    }
    if (sameBranch(next, this.scope)) {
      return;
    }
    const centre = next.focus ?? this.scope.focus;
    this.scope = next;
    this.relayout({ centre });
    const view = this.canvas.view();
    this.host.stateChanged({ scope: scopeOf(next), ...(view ? { view } : {}) });
  }

  private relayout(opening: Opening | null): void {
    const model = this.model;
    if (!model) {
      return;
    }
    const layout = fileGraphOf(model, this.scope);
    const focus = layout.focus === null ? undefined : model.people.get(layout.focus);
    this.scopeBar.draw(this.scope, {
      total: model.people.size,
      shown: layout.cards.length,
      focusName: focus ? personName(focus.row) : null,
    });
    if (this.shown === layout && !opening) {
      return;
    }
    this.shown = layout;
    this.canvas.show(sceneOf(model, layout, this.scope, (xref) => this.host.portrait?.(xref) ?? null), opening);
  }

  private legend(parent: HTMLElement): void {
    const toggle = parent.createEl("button", {
      cls: "gedcom-fg-legend-toggle",
      text: t("overview.legend"),
      attr: { type: "button", "aria-expanded": "false" },
    });
    toggle.addEventListener("click", () => {
      const open = !parent.hasClass("is-open");
      parent.toggleClass("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    const entry = (cls: string, text: string) => {
      const item = parent.createSpan({ cls: "gedcom-fg-legend-item" });
      item.createSpan({ cls: `gedcom-fg-swatch ${cls}` });
      item.appendText(text);
    };
    entry("is-f", t("overview.legend.woman"));
    entry("is-m", t("overview.legend.man"));
    entry("is-u", t("overview.legend.unknown"));
    entry("is-family", t("fileGraph.legend.family"));
    entry("is-undated", t("fileGraph.legend.undated"));
  }

}

function sceneOf(
  model: FileTimeline,
  layout: CanvasScene["layout"],
  scope: BranchScope,
  portrait: (xref: string) => PortraitContent | null,
): CanvasScene {
  const search = new Map(
    [...model.people.values()].map((person) => [
      person.xref,
      [personName(person.row), ...person.row.otherNames].join(" ").toLowerCase(),
    ]),
  );
  return {
    layout,
    card: (xref) => {
      const person = model.people.get(xref);
      return person
        ? {
            name: personName(person.row),
            years: lifelineYears(person.lifeline),
            sex: person.sex,
            focus: xref === scope.focus,
            branch: true,
            ...(person.row.given && person.row.surname ? { given: person.row.given, surname: person.row.surname } : {}),
            portrait: () => portrait(xref),
          }
        : undefined;
    },
    family: (xref) => {
      const family = model.families.get(xref);
      if (!family) {
        return undefined;
      }
      const marriage = family.marriage?.event;
      return {
        couple: familyTitle(
          family.spouses
            .map((one) => model.people.get(one)?.row.name)
            .filter((name): name is string => name !== undefined),
        ),
        ...(marriage?.date?.text ? { date: marriage.date.text } : {}),
        ...(marriage?.place ? { place: marriage.place } : {}),
        children: family.children.length,
      };
    },
    related: (xref) => model.related(xref),
    search: (xref) => search.get(xref) ?? "",
  };
}

function scopeOf({ focus, up, down }: BranchScope): BranchScope {
  return { ...(focus === undefined ? {} : { focus }), up, down };
}
