## Context

- The list (`src/desk/fileList.ts`, `src/desk/listRows.ts`) has five kinds (`people`, `families`, `sources`, `places`, `events`): `LIST_KINDS`, `COLUMNS`, `cellsOf`, `sortValue`, `listRows`, search per kind, counts, and a saved kind and sort per kind in the tab's state.
- The read model (`src/genealogy/build.ts`, `index.ts`) builds people, families and sources from `getDocumentSymbols()` in one pass per revision, and answers `media(xref)` and `record(xref)` (the whole record as `RecordLine`s).
- `pageKind(index, xref)` (`src/desk/deskState.ts`) decides whether a record has a card (`person`, `family`, `source`, `media`, `place`, `event`); `renderPointer` (`src/desk/detail/lineView.ts`) draws a pointer as a link only where `pageKind` answers. A place has a synthetic id (`placeId`), which is the precedent for a record without an identifier.
- The card is drawn by `drawRecord` (`src/desk/recordCard.ts`) by page kind; `renderLines` draws any record's lines in the card's style.

## Goals / Non-Goals

**Goals:** every record a file declares can be found in the list and opened on a card; adding a kind follows the pattern the places and the events set.

**Non-Goals:** editing (PR #260); a new media card.

## Decisions

**The new rows are read in the existing pass.** `build.ts` already walks every top-level symbol; it also collects media, shared notes, repositories and other records, and counts, for every line whose payload is a pointer `@X@`, the target `X`. The counts are one `Map<string, number>` on the index (`linkedFrom(xref)`), shared by all four kinds. Alternative: count on demand per row. Rejected: a list of 1 478 notes would walk the file 1 478 times.

**One page kind for the new cards: `record`.** `pageKind` answers `record` for a shared note, a repository, a submitter and a record of the file's own with an identifier, and for the header's id. The card draws them with one `renderRecordPage` (`src/desk/recordPage.ts`): a heading from the record's name and `renderLines` over the record's lines. Alternative: one page per kind. Rejected: they differ only in their heading, and PR #260 will replace the body with the tree anyway — one call site to swap.

**The header has a synthetic id, `header:`, as a place has `place:`.** It has no identifier in the file. `record(HEADER)` returns the header's lines; selecting it and the tab's saved selection work as for a place.

**Names.** A note is named by its first line; a repository by `NAME`; a submitter by `NAME`; a record of the file's own by its `NAME`, `TITL` or first value, in that order, and by its tag where it has none; the header by *File header*. A kind's label in the reader's language comes from `tagLabel`, a custom tag as written.

**Nine kinds, and a dropdown where they do not fit.** The kinds' row becomes an Obsidian `dropdown` when the tab is narrower than the buttons need (a container query on the list, as the list already uses for its phone layout). Alternative: two rows of buttons. Rejected: the row also holds the search and would take three lines on a phone.

**Search.** Each new kind searches the columns it shows, and Notes searches the whole text of a note, because a note's first line rarely says what the reader looks for.

**Pointers become links.** Because `pageKind` now answers for these records, `renderPointer` draws a pointer to a repository, a shared note or a submitter as a link on every card, with no change of its own.

## Risks / Trade-offs

- [Merge with PR #260, which removes the Events kind and replaces the card body] → `LIST_KINDS` and `COLUMNS` are edited in one place each; the record page's body is one call to `renderLines`, which the merge replaces with the tree. Recorded here so the merge is mechanical.
- [1 478 notes] → The list already renders large kinds incrementally (the requirement that the list holds up at size); the Playwright spec times the Notes of the Gramps export.
- [A 5.5.1 `NOTE` record whose text is in `CONC`/`CONT`] → The note's text is the record line's joined text, as `recordLines` already joins it.

## Migration Plan

None. A saved list kind unknown to an older build falls back to People, as the list already does.

## Open Questions

None that change what gets built.
