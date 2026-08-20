import {
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  openSearchPanel,
  replaceAll,
  replaceNext,
  SearchQuery,
  selectMatches,
  setSearchQuery,
} from "@codemirror/search";
import { StateEffect, StateField, type Extension } from "@codemirror/state";
import type { EditorView, Panel } from "@codemirror/view";

import { countMatches, describeMatches } from "./searchMatches";
import {
  searchBindings,
  SEARCH_KEY_CAPTIONS,
  type ScopePusher,
  type SearchKeyActions,
} from "./searchKeys";

export type IconSetter = (element: HTMLElement, icon: string) => void;

/** What the panel needs of its host, which is where `obsidian` stays. */
export interface PanelHost {
  setIcon: IconSetter;
  pushScope: ScopePusher;
}

/** Obsidian's own delay before it acts on what is being typed into a search. */
const SETTLE_MS = 150;

const setReplaceMode = StateEffect.define<boolean>();

/** Obsidian writes a tooltip as the label, then its key on a line of its own. */
const tooltip = (
  label: string,
  action: keyof typeof SEARCH_KEY_CAPTIONS,
): string => `${label}\n${SEARCH_KEY_CAPTIONS[action]}`;

/** Replace has no control in the row, so the mode it opens in is state. */
export const replaceMode: Extension = StateField.define<boolean>({
  create: () => false,
  update: (mode, transaction) =>
    transaction.effects.reduce(
      (current, effect) => (effect.is(setReplaceMode) ? effect.value : current),
      mode,
    ),
});

const replacing = (view: EditorView): boolean =>
  view.state.field(replaceMode as StateField<boolean>, false) ?? false;

export function openSearch(view: EditorView, replace: boolean): void {
  view.dispatch({ effects: setReplaceMode.of(replace) });
  openSearchPanel(view);
}

export function obsidianSearchPanel(host: PanelHost) {
  return (view: EditorView): Panel => {
    // The view's own document and window, not this file's: a popout has both.
    const owner = view.dom.ownerDocument;
    const timers = owner.defaultView ?? window;
    let settle: number | undefined;

    const element = <K extends keyof HTMLElementTagNameMap>(
      tag: K,
      cls: string,
    ): HTMLElementTagNameMap[K] => {
      const node = owner.createElement(tag);
      node.className = cls;
      return node;
    };
    const field = (placeholder: string): HTMLInputElement => {
      const input = element("input", "");
      input.type = "text";
      input.placeholder = placeholder;
      return input;
    };

    const dom = element("div", "document-search-container");
    const searchRow = element("div", "document-search");
    const inputWrap = element(
      "div",
      "search-input-container document-search-input",
    );
    const searchInput = field("Find...");
    searchInput.setAttribute("main-field", "true");
    const countEl = element("div", "document-search-count");
    const buttons = element("div", "document-search-buttons");
    const replaceRow = element("div", "document-replace");
    const replaceInput = field("Replace...");
    replaceInput.classList.add("document-replace-input");
    const replaceButtons = element("div", "document-replace-buttons");

    inputWrap.append(searchInput, countEl);
    searchRow.append(inputWrap, buttons);
    replaceRow.append(replaceInput, replaceButtons);
    dom.append(searchRow, replaceRow);

    const commit = (): void => {
      view.dispatch({
        effects: setSearchQuery.of(
          new SearchQuery({
            search: searchInput.value,
            replace: replaceInput.value,
          }),
        ),
      });
    };

    const showCount = (): void => {
      const matches = countMatches(view.state, getSearchQuery(view.state));
      const empty = searchInput.value === "";
      countEl.textContent = empty ? "" : describeMatches(matches);
      inputWrap.classList.toggle("mod-no-match", !empty && matches.total === 0);
    };

    const later = (run: () => void): void => {
      timers.clearTimeout(settle);
      settle = timers.setTimeout(run, SETTLE_MS);
    };

    const button = (
      parent: HTMLElement,
      icon: string,
      label: string,
      onClick: () => void,
    ): HTMLButtonElement => {
      const control = element(
        "button",
        "clickable-icon document-search-button",
      );
      control.type = "button";
      control.setAttribute("aria-label", label);
      host.setIcon(control, icon);
      // Keeping focus in the field is what lets Enter go on finding matches.
      control.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
      control.addEventListener("click", (event) => {
        event.preventDefault();
        onClick();
      });
      parent.append(control);
      return control;
    };

    button(buttons, "arrow-up", tooltip("Previous", "findPrevious"), () =>
      findPrevious(view),
    );
    button(buttons, "arrow-down", tooltip("Next", "findNext"), () =>
      findNext(view),
    );
    button(
      buttons,
      "text-select",
      tooltip("Select all matches", "selectAll"),
      () => selectMatches(view),
    );

    const close = button(buttons, "x", "Exit search", () =>
      closeSearchPanel(view),
    );
    close.classList.remove("document-search-button");
    close.classList.add("document-search-close-button");

    button(replaceButtons, "replace", tooltip("Replace", "replaceNext"), () =>
      replaceNext(view),
    );
    button(
      replaceButtons,
      "replace-all",
      tooltip("Replace all", "replaceAll"),
      () => replaceAll(view),
    );

    for (const input of [searchInput, replaceInput]) {
      input.addEventListener("input", () => {
        commit();
        later(showCount);
      });
    }

    const actions: SearchKeyActions = {
      findNext: () => {
        findNext(view);
      },
      findPrevious: () => {
        findPrevious(view);
      },
      close: () => {
        closeSearchPanel(view);
      },
      selectAll: () => {
        selectMatches(view);
      },
      replaceNext: () => {
        replaceNext(view);
      },
      replaceAll: () => {
        replaceAll(view);
      },
      focused: () => {
        const active = owner.activeElement;
        if (active === searchInput) {
          return "search";
        }
        return active === replaceInput ? "replace" : null;
      },
      // Two fields, so either direction is the other one.
      moveFocus: () => {
        if (!replacing(view)) {
          return false;
        }
        const target =
          owner.activeElement === replaceInput ? searchInput : replaceInput;
        target.focus();
        target.select();
        return true;
      },
    };
    let popScope: (() => void) | undefined;

    return {
      dom,
      top: true,
      mount() {
        popScope = host.pushScope(searchBindings(actions));
        searchInput.value = getSearchQuery(view.state).search;
        replaceInput.value = getSearchQuery(view.state).replace;
        dom.classList.toggle("mod-replace-mode", replacing(view));
        // Opening the panel is all the command does; the focus is the panel's.
        searchInput.focus();
        searchInput.select();
        showCount();
      },
      update(update) {
        const query = getSearchQuery(update.state);
        const requeried = update.transactions.some((transaction) =>
          transaction.effects.some((effect) => effect.is(setSearchQuery)),
        );
        if (requeried && query.search !== searchInput.value) {
          searchInput.value = query.search;
        }
        if (
          update.transactions.some((transaction) =>
            transaction.effects.some((effect) => effect.is(setReplaceMode)),
          )
        ) {
          dom.classList.toggle("mod-replace-mode", replacing(update.view));
        }
        if (update.docChanged || update.selectionSet || requeried) {
          later(showCount);
        }
      },
      destroy() {
        popScope?.();
        timers.clearTimeout(settle);
      },
    };
  };
}
