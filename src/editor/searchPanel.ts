import {
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  replaceAll,
  replaceNext,
  SearchQuery,
  selectMatches,
  setSearchQuery,
} from "@codemirror/search";
import type { EditorView, Panel } from "@codemirror/view";

import { countMatches, describeMatches } from "./searchMatches";

export type IconSetter = (element: HTMLElement, icon: string) => void;

/** Obsidian's own delay before it acts on what is being typed into a search. */
const SETTLE_MS = 150;

type FlagKey = "caseSensitive" | "wholeWord" | "regexp";

export const SEARCH_FLAGS: { key: FlagKey; icon: string; label: string }[] = [
  { key: "caseSensitive", icon: "uppercase-lowercase-a", label: "Match case" },
  { key: "wholeWord", icon: "whole-word", label: "Whole word" },
  { key: "regexp", icon: "regex", label: "Regular expression" },
];

export function obsidianSearchPanel(setIcon: IconSetter) {
  return (view: EditorView): Panel => {
    const opening = getSearchQuery(view.state);
    const flags: Record<FlagKey, boolean> = {
      caseSensitive: opening.caseSensitive,
      wholeWord: opening.wholeWord,
      regexp: opening.regexp,
    };
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
    const searchInput = field("Find");
    searchInput.setAttribute("main-field", "true");
    const countEl = element("div", "document-search-count");
    const buttons = element("div", "document-search-buttons");
    const replaceRow = element("div", "document-replace");
    const replaceInput = field("Replace");
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
            ...flags,
          }),
        ),
      });
    };

    const showCount = (): void => {
      const query = getSearchQuery(view.state);
      const empty = searchInput.value === "";
      countEl.textContent = empty
        ? ""
        : describeMatches(countMatches(view.state, query));
      inputWrap.classList.toggle("mod-no-match", !empty && !query.valid);
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
      setIcon(control, icon);
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

    const replaceToggle = button(searchRow, "chevron-right", "Replace", () => {
      const on = !dom.classList.contains("mod-replace-mode");
      dom.classList.toggle("mod-replace-mode", on);
      replaceToggle.classList.toggle("is-active", on);
      setIcon(replaceToggle, on ? "chevron-down" : "chevron-right");
      (on ? replaceInput : searchInput).focus();
    });
    searchRow.prepend(replaceToggle);

    button(buttons, "arrow-up", "Previous", () => findPrevious(view));
    button(buttons, "arrow-down", "Next", () => findNext(view));
    button(buttons, "text-select", "Select all matches", () =>
      selectMatches(view),
    );
    for (const flag of SEARCH_FLAGS) {
      const control = button(buttons, flag.icon, flag.label, () => {
        flags[flag.key] = !flags[flag.key];
        control.classList.toggle("is-active", flags[flag.key]);
        commit();
        later(showCount);
      });
      control.classList.toggle("is-active", flags[flag.key]);
    }

    const close = button(searchRow, "x", "Exit search", () =>
      closeSearchPanel(view),
    );
    close.classList.remove("document-search-button");
    close.classList.add("document-search-close-button");

    button(replaceButtons, "replace", "Replace", () => replaceNext(view));
    button(replaceButtons, "replace-all", "Replace all", () =>
      replaceAll(view),
    );

    for (const input of [searchInput, replaceInput]) {
      input.addEventListener("input", () => {
        commit();
        later(showCount);
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          closeSearchPanel(view);
          return;
        }
        if (event.key !== "Enter" || event.isComposing) {
          return;
        }
        event.preventDefault();
        if (input === replaceInput) {
          replaceNext(view);
        } else if (event.shiftKey) {
          findPrevious(view);
        } else {
          findNext(view);
        }
      });
    }

    return {
      dom,
      top: true,
      mount() {
        searchInput.value = getSearchQuery(view.state).search;
        replaceInput.value = getSearchQuery(view.state).replace;
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
        if (update.docChanged || update.selectionSet || requeried) {
          later(showCount);
        }
      },
      destroy() {
        timers.clearTimeout(settle);
      },
    };
  };
}
