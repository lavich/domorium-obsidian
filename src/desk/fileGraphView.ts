import { searchOver, type FloatingSearch } from "./floatingSearch";
import { BranchScopeBar, readBranchScope, sameBranch, type BranchScope } from "./branchScope";
import { fileGraphOf } from "./fileGraph";
import type { FileTimeline } from "./fileTimeline";
import { paintStyle } from "./surnameHue";
import {
  GraphCanvas,
  ZOOM,
  type CanvasScene,
  type GraphView,
  type GraphWindow,
  type Opening,
} from "./graphCanvas";
import { familyTitle, lifelineYears, personName } from "./labels";

export { polyline, fitText, ZOOM, type GraphView, type GraphWindow } from "./graphCanvas";


export interface GraphState extends BranchScope {
  view?: GraphView;
}

export interface GraphSettings {
  scope: BranchScope;
  around?: string;
  view?: GraphView;
}

export interface FileGraphHost {
  /** A person or a family. */
  select(xref: string): void;
  /** `view` is absent until the canvas has had a size. */
  stateChanged(settings: { scope: BranchScope; view?: GraphView }): void;
  setIcon(element: HTMLElement, icon: string): void;
  /** The picture the person's page shows, where it can be shown. */
}

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function readGraphState(state: unknown): GraphState {
  const raw = typeof state === "object" && state !== null ? (state as Record<string, unknown>) : {};
  const view = typeof raw.view === "object" && raw.view !== null ? (raw.view as Record<string, unknown>) : null;
  return {
    ...readBranchScope(raw),
    ...(view && finite(view.x) && finite(view.y) && finite(view.k)
      ? { view: { x: view.x, y: view.y, k: Math.min(ZOOM.max, Math.max(ZOOM.min, view.k)) } }
      : {}),
  };
}

/** The graph of a file: a scope bar and a canvas with its search and zoom floating over it. */
export class FileGraphBoard {
  private readonly root: HTMLElement;
  private readonly find: FloatingSearch;
  private readonly scopeBar: BranchScopeBar;
  private readonly canvas: GraphCanvas;
  private model: FileTimeline | null = null;
  private scope: BranchScope = readBranchScope(null);
  private shown: unknown = null;

  constructor(
    parent: HTMLElement,
    private readonly host: FileGraphHost,
  ) {
    this.root = parent.createDiv({ cls: "gedcom-fg" });
    this.scopeBar = new BranchScopeBar(this.root, {
      prefix: "gedcom-fg",
      change: (next) => this.setScope(next),
    });
    this.canvas = new GraphCanvas(this.root, {
      activateCard: (xref) => this.host.select(xref),
      activateFamily: (xref) => this.host.select(xref),
      branch: (xref) => this.setScope({ focus: xref === this.scope.focus ? undefined : xref }),
      viewChanged: (view) => this.host.stateChanged({ scope: scopeOf(this.scope), view }),
    }, { setIcon: (element, icon) => this.host.setIcon(element, icon) });
    this.find = searchOver(this.canvas, (element, icon) => this.host.setIcon(element, icon));
  }

  show(model: FileTimeline, settings: GraphSettings): void {
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
    this.relayout(opening);
    this.find.refresh();
  }

  resized(size?: { width: number; height: number }): void {
    this.canvas.resized(size);
  }

  cancelHover(): void {
    this.canvas.cancelHover();
  }

  /** Marks a person selected, and with `reveal` centres on them, in their own branch where this one does not hold them; `null` ends it. */
  select(xref: string | null, reveal: boolean): void {
    if (reveal && xref !== null && this.model?.people.has(xref) && !this.canvas.hasCard(xref)) {
      this.setScope({ focus: xref });
    }
    this.canvas.select(xref, reveal);
  }

  openSearch(): void {
    if (this.find.isOpen()) {
      this.find.focus();
    } else {
      this.find.open();
    }
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
    this.scopeBar.draw({
      total: model.people.size,
      shown: layout.cards.length,
      focusName: focus ? personName(focus.row) : null,
    });
    if (this.shown === layout && !opening) {
      return;
    }
    this.shown = layout;
    this.canvas.show(sceneOf(model, layout, this.scope), opening);
  }

}

function sceneOf(
  model: FileTimeline,
  layout: CanvasScene["layout"],
  scope: BranchScope,
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
            paint: paintStyle(person.surname),
            focus: xref === scope.focus,
            branch: true,
            ...(person.row.given && person.row.surname ? { given: person.row.given, surname: person.row.surname } : {}),
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
    branch: (xref) => model.branch(xref),
    search: (xref) => search.get(xref) ?? "",
  };
}

function scopeOf({ focus }: BranchScope): BranchScope {
  return focus === undefined ? {} : { focus };
}
