# What the research desk needs from lavich/domorium

Checked against `@domorium/language-service` 2.1.0, `@domorium/codemirror`
2.0.1, and the upstream checkout at 977fce5. Upstream already has safe edit
delivery — `WorkspaceEdit` with a document version and typed `EditRefusal` —
used by rename and quick fixes. What is missing is everything a form needs.

## Blockers for editing

1. **Structural operations** (`packages/mutations` on the upstream roadmap):
   set a value, add a substructure, remove with reference cleanup, create a
   record, link. Linking sets both halves of a pointer pair (FAMS↔HUSB/WIFE,
   FAMC↔CHIL).

   ```ts
   planEdit(mutations: Mutation[], expectedVersion): 
     { ok: true; edit: WorkspaceEdit; diagnosticsAfter: Diagnostic[] } | EditRefusal
   ```

2. **Minimal diffs**: touch only the affected lines; keep line endings,
   indentation and sibling order.
3. **Identifier allocation**: `allocateXref(prefix)` over the reference index.
4. **Validation before applying**: apply to a copy, return only new diagnostics.
5. **Dialect-aware values**: CONT/CONC splitting (no CONC in 7.0), `@@`
   escaping, and at least recognising 5.5.1 encodings (ANSEL, UTF-16) so a
   write cannot corrupt a file.

## Important

- **Schema access.** `GedcomDocument.scheme` is private, so the plugin names its
  event tags by hand (`genealogy/tags.ts` on `feat/person-browser`). Wanted:
  substructures and cardinality of a type, whether it is an event, payload kind,
  enumerations — also what forms are built from.
- **Value and pointer apart.** `DocumentSymbol.detail` mixes value, xref and
  pointer, and CONC/CONT arrive as children. Wanted: `value` (joined),
  `pointer`, `xref`, `type`.
- **Dates.** Only validity checks are exported. Wanted: `parseDate` with
  calendars, ranges and dual years, a sortable day number, and `formatDate`.
- **Places.** Wanted: `parsePlace` with parts, `FORM`, and `MAP LATI/LONG`.
- **Incremental parsing.** Every change rebuilds the document (upstream
  `TODO.md`, #210, low priority). Form edits on thousands of records need it
  raised, with stable symbol objects for unchanged records and a public version.
- **Stable identity.** A record identity through `UID`, and a rename map, so
  links from notes survive edits.
- **Undo granularity.** One labelled `WorkspaceEdit` per form operation.

## Nice to have

Name parsing (NPFX/GIVN/SURN/TRAN), labels per locale and diagnostics with
stable codes, GEDCOM 7 extension tags exposed, media references without a
cursor position, cross-document references.

The read model prototype on `feat/person-browser` (`src/genealogy/`) is a
reasonable starting shape for the roadmap's `packages/query` and
`packages/graph`.
