import { normalizeXref } from "../genealogy";

/** A link or an embed as Obsidian's link cache reports it. */
export interface CachedLink {
  /** The target, without the alias: `tree.ged#@I1@`. */
  link: string;
  start: number;
  end: number;
}

export interface NoteLinks {
  path: string;
  name: string;
  text: string;
  links: CachedLink[];
}

export interface NoteLine {
  line: number;
  before: string;
  link: string;
  after: string;
}

export interface NoteHit {
  path: string;
  name: string;
  lines: NoteLine[];
}

/** How much of the line is kept on either side of the link. */
const REACH = 80;

const WIKILINK = /!?\[\[((?:[^\]\\]|\\.)+?)\]\]/gu;

function shown(inner: string): string {
  const alias = /^(.*?)\\?\|(.*)$/u.exec(inner);
  if (alias) {
    return alias[2] ?? "";
  }
  return inner.replace(/#\^?/u, " › ");
}

function readable(line: string, from: number, to: number): { text: string; start: number; end: number } {
  let text = "";
  let start = -1;
  let end = -1;
  let last = 0;
  for (const match of line.matchAll(WIKILINK)) {
    const at = match.index;
    text += line.slice(last, at);
    const read = shown(match[1] ?? "");
    if (at === from) {
      start = text.length;
      end = start + read.length;
    }
    text += read;
    last = at + match[0].length;
  }
  text += line.slice(last);
  if (start < 0) {
    return { text: line, start: from, end: to };
  }
  return { text, start, end };
}

function lineAround(text: string, link: CachedLink): NoteLine {
  const lineStart = text.lastIndexOf("\n", link.start - 1) + 1;
  const newline = text.indexOf("\n", link.end);
  const lineEnd = newline < 0 ? text.length : newline;
  const line = text.slice(lineStart, lineEnd);
  const read = readable(line, link.start - lineStart, link.end - lineStart);
  const from = Math.max(0, read.start - REACH);
  const to = Math.min(read.text.length, read.end + REACH);
  return {
    line: text.slice(0, lineStart).split("\n").length - 1,
    before: (from > 0 ? "…" : "") + read.text.slice(from, read.start).trimStart(),
    link: read.text.slice(read.start, read.end),
    after: read.text.slice(read.end, to).trimEnd() + (to < read.text.length ? "…" : ""),
  };
}

/** `resolve` answers which vault file a link's path means from a note. */
export function notesLinking(
  notes: NoteLinks[],
  target: { path: string; xref: string },
  resolve: (linkPath: string, from: string) => string | null,
): NoteHit[] {
  const xref = normalizeXref(target.xref);
  const hits: NoteHit[] = [];
  for (const note of notes) {
    const lines: NoteLine[] = [];
    for (const link of note.links) {
      // A link in a table escapes the pipe before its alias.
      const written = link.link.replace(/\\$/u, "");
      const hash = written.lastIndexOf("#");
      if (hash <= 0 || normalizeXref(written.slice(hash + 1)) !== xref) {
        continue;
      }
      if (resolve(written.slice(0, hash), note.path) !== target.path) {
        continue;
      }
      lines.push(lineAround(note.text, link));
    }
    if (lines.length > 0) {
      hits.push({ path: note.path, name: note.name, lines });
    }
  }
  return hits;
}
