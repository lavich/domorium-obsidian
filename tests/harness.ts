import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import type { Page } from "@playwright/test";

export const SAMPLE = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "1 NAME John /Smith/",
  "1 FAMS @F1@",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
  "1 NCHI abc",
  "0 TRLR",
  "",
].join("\n");

/** A file with an error, a warning and a broken pointer, in that order. */
export const PROBLEMS = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "1 NAME",
  "1 FOO bar",
  "1 FAMC @F9@",
  "0 TRLR",
  "",
].join("\n");

/** A web address and a path into the vault, which are the two kinds of link. */
export const LINKS = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "1 NAME Marie /Curie/",
  "1 WWW https://domorium.com/",
  "0 @O1@ OBJE",
  "1 FILE media/marie.jpg",
  "2 FORM image/jpeg",
  "0 TRLR",
  "",
].join("\n");

/** The offset of the first character of a line, counting from 1. */
export function lineStart(doc: string, line: number): number {
  return doc
    .split("\n")
    .slice(0, line - 1)
    .reduce((offset, text) => offset + text.length + 1, 0);
}

export function offsetOf(doc: string, needle: string): number {
  const offset = doc.indexOf(needle);
  if (offset < 0) {
    throw new Error(`harness: ${needle} is not in the sample`);
  }
  return offset;
}

/** One photograph asked for three ways: whole, and through two rectangles. */
export const MEDIA = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @O1@ OBJE",
  "1 FILE media/family.jpg",
  "2 FORM image/jpeg",
  "0 @O2@ OBJE",
  "1 FILE media/interview.mp3",
  "2 FORM audio/mpeg",
  "0 @O3@ OBJE",
  "1 FILE https://example.org/marie.jpg",
  "2 FORM image/jpeg",
  "0 @O4@ OBJE",
  "1 FILE media/gone.jpg",
  "2 FORM image/jpeg",
  "0 @I1@ INDI",
  "1 NAME Marie /Curie/",
  "1 OBJE @O1@",
  "2 CROP",
  "3 TOP 10",
  "3 LEFT 20",
  "3 HEIGHT 30",
  "3 WIDTH 40",
  "2 TITL Marie, second from the left",
  "0 @I2@ INDI",
  "1 NAME Pierre /Curie/",
  "1 OBJE @O1@",
  "2 CROP",
  "3 TOP 40",
  "3 LEFT 100",
  "3 HEIGHT 100",
  "3 WIDTH 100",
  "1 FAMS @F1@",
  "0 @I3@ INDI",
  "1 NAME Irene /Curie/",
  "1 OBJE @O1@",
  "2 CROP",
  "3 TOP 900",
  "3 LEFT 900",
  "3 HEIGHT 50",
  "3 WIDTH 50",
  "0 @F1@ FAM",
  "1 HUSB @I2@",
  "0 TRLR",
  "",
].join("\n");

export interface MountOptions {
  doc?: string;
  dark?: boolean;
  diagnostics?: boolean;
  indentationHints?: boolean;
  recordPreview?: "modifier" | "hover" | "off";
  mediaPreview?: "modifier" | "hover" | "off";
  /** Vault path to a name in the harness's own images, or bytes of its own. */
  media?: Record<string, string>;
  pane?: number;
  holdImages?: boolean;
  mobile?: boolean;
  keyboard?: number;
}

export async function mount(
  page: Page,
  options: MountOptions = {},
): Promise<void> {
  await page.goto(pathToFileURL(resolve("harness/index.html")).href);
  await page.evaluate(
    (mountOptions) => {
      window.gedcom.mount(mountOptions);
    },
    { doc: options.doc ?? SAMPLE, ...options },
  );
  await page.waitForSelector(".cm-content");
}

export function colorOf(page: Page, selector: string): Promise<string> {
  return page.evaluate((target) => {
    const element = document.querySelector(target);
    if (!element) {
      throw new Error(`harness: ${target} is not on the page`);
    }
    return getComputedStyle(element).color;
  }, selector);
}
