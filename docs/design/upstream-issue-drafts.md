# Drafts for lavich/domorium

Three issues the research desk needs from upstream, beside
[#378](https://github.com/lavich/domorium/issues/378) (dates) and
[#379](https://github.com/lavich/domorium/issues/379) (the read model, which
also names the event/value gap). Checked against
`@domorium/language-service` 2.1.0 and upstream `main` at 837f388. Not filed;
each section below is one issue, title first.

---

## A multi-line value reaches a consumer as its first line, and a shared note's text not at all

### What happens

`getDocumentSymbols()` gives each line its payload in `detail`, and a
continuation line is a child symbol of its own:

```
TEXT | detail="First line of the register entry"
  CONT | detail="second line"
```

So a consumer that wants the value of a `NOTE`, a citation's `DATA.TEXT`, an
`ADDR` or any long payload has to walk the children and join them itself,
knowing that `CONT` means a line break, that `CONC` means none and exists only
in 5.5.1, and that `@@` in a payload stands for `@`. The library already knows
all three; it has to, to validate the file.

A shared note record is worse off. At level 0, `detail` is the record's
identifier, so the note's text is not in `detail` at all. The only place it
appears is `label`, which holds its first line:

```
SNOTE | detail="@N1@" | label="The only person to have won a Nobel Prize in two different sciences:"
  CONT | detail="physics in 1903 and chemistry in 1911."
```

### What it costs

`domorium-obsidian` shows no notes from the file and no citation text in its
genealogy pages, because the alternative is a second reader of continuation
lines that would be wrong in 5.5.1 the first time it met a `CONC` or an escaped
`@@`. Every other consumer that shows a note — the VS Code hover, the web
editor's record preview — faces the same choice.

### Proposed

A symbol for a line that can carry a payload gains its value, joined and
unescaped as the dialect says, apart from any pointer:

```ts
interface DocumentSymbol {
  // as today, plus:
  /** The payload with CONT/CONC joined and @@ unescaped; absent for a pointer. */
  value?: string;
  /** The cross-reference the line points at, where it points at one. */
  pointer?: string;
}
```

A shared note record's `value` is its text. `detail` keeps its meaning, so
nothing that reads it today changes. Whether `CONT`/`CONC` stay as children is
the library's call; a consumer reading `value` no longer needs them.

### Reproducing

```ts
const doc = [
  "0 HEAD", "1 GEDC", "2 VERS 7.0",
  "0 @N1@ SNOTE The only person to have won a Nobel Prize in two different sciences:",
  "1 CONT physics in 1903 and chemistry in 1911.",
  "0 TRLR", "",
].join("\n");
new GedcomLanguageService(doc).getDocumentSymbols()[1];
// { name: "SNOTE", detail: "@N1@", label: "The only person…sciences:", children: [CONT…] }
```

---

## A personal name reaches a consumer as one string with slashes, and its parts and type are left behind

### What happens

A record's `label`, and its `NAME` line's `detail`, are the payload as written:
`Marie /Skłodowska-Curie/`. The structures beneath a name that say what it is
made of and what kind of name it is arrive as plain child symbols:

```
NAME | detail="Marie /Skłodowska-Curie/"
  GIVN | detail="Marie"
  SURN | detail="Skłodowska-Curie"
NAME | detail="Maria Salomea /Skłodowska/"
  TYPE | detail="BIRTH"
```

Nothing reads them. The slashes mark the surname, but where they sit, what
`GIVN`/`SURN`/`NPFX`/`NSFX`/`SPFX`/`NICK` say when they disagree with the
payload, and how a `TRAN` relates to its name, are rules of the format that
each consumer would otherwise learn on its own.

### What it costs

`domorium-obsidian` shows a name as one string with the slashes removed. Its
index cannot sort or group people by surname, a timeline cannot say "Birth of
sister Zofia" rather than repeating the surname, and "Maria Salomea Skłodowska"
cannot be labelled as a birth name. A consumer that does split names will
disagree with the next one about a name like `/de la Cruz/ y Ruiz`.

### Proposed

A reading of a name, exported beside the symbols:

```ts
interface PersonalName {
  /** As written, slashes and all. */
  text: string;
  /** For display: the parts joined in the order the line writes them. */
  display: string;
  given?: string;
  surname?: string;
  prefix?: string;
  suffix?: string;
  surnamePrefix?: string;
  nickname?: string;
  /** BIRTH, MARRIED, AKA, … as the TYPE says; its PHRASE where it has one. */
  type?: { value: string; phrase?: string };
  translations: PersonalName[];
}

function readName(name: DocumentSymbol): PersonalName;
```

Parts the substructures state win over parts read from the slashes, as the
specification has it; a name with neither keeps `display` and nothing else.

### Reproducing

```ts
new GedcomLanguageService([
  "0 HEAD", "1 GEDC", "2 VERS 7.0",
  "0 @I1@ INDI", "1 NAME Maria Salomea /Skłodowska/", "2 TYPE BIRTH",
  "0 TRLR", "",
].join("\n")).getDocumentSymbols()[1].label;
// "Maria Salomea /Skłodowska/" — no parts, no type
```

---

## A place reaches a consumer as one string, and its coordinates as two more strings

### What happens

A `PLAC` line's `detail` is the place as written, and its `MAP` coordinates are
two child symbols whose payloads keep the format's hemisphere letters:

```
PLAC | detail="Warsaw, Congress Poland"
  MAP
    LATI | detail="N52.2297"
    LONG | detail="E21.0122"
```

The jurisdictions in a place are comma-separated and named, in order, by a
`FORM` — on the place itself, or for the whole file in `HEAD.PLAC.FORM` — and
coordinates are degrees with a hemisphere prefix that the validator already
checks.

### What it costs

`domorium-obsidian` lists the places of a life as written and draws no map.
Shortening "Warsaw, Congress Poland" to its town, grouping two spellings of one
city, or putting a pin anywhere would each mean re-reading the place grammar
and the coordinate format in the plugin.

### Proposed

```ts
interface PlaceValue {
  text: string;
  /** Jurisdictions, smallest first, as the payload lists them. */
  parts: string[];
  /** What each part is, from the place's FORM or the header's. */
  form?: string[];
  /** Signed decimal degrees, where MAP states both and both are valid. */
  coordinates?: { latitude: number; longitude: number };
}

function readPlace(place: DocumentSymbol, document: DocumentSymbol[]): PlaceValue;
```

A coordinate the validator rejects yields no `coordinates`, rather than a
guessed one.

### Reproducing

```ts
// The BIRT above: PLAC "Warsaw, Congress Poland", MAP LATI "N52.2297" LONG "E21.0122".
// getDocumentSymbols() gives the three strings; nothing gives 52.2297, 21.0122.
```
