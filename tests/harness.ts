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

export interface MountOptions {
  doc?: string;
  dark?: boolean;
  diagnostics?: boolean;
  indentationHints?: boolean;
  recordPreview?: "modifier" | "hover" | "off";
  mobile?: boolean;
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
