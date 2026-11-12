import {
  encodeFileTarget,
  relativeFilePath,
  resolveFileTarget,
  type GedcomDialect,
  type GedcomLanguageService,
  type Position,
  type StructureEditResult,
} from "@domorium/language-service";

import { isImagePath } from "../genealogy";
import { t } from "../i18n";
import { isGedcomPath } from "../vault/movedFiles";
import type { FieldChoice } from "./detail/tree";
import { joinEdits, type Refusal, type WriteOutcome } from "./edits";

export const OUT_OF_REACH = "file-out-of-reach";
export const COPY_FAILED = "copy-failed";

export interface FileAt {
  file: Position;
  form?: Position;
}

export interface VaultFileChoice {
  path: string;
  checked: boolean;
}

/** What choosing a file came to; a refusal after a copy names the copy, which stays in the vault. */
export type FileOutcome = WriteOutcome | (Refusal & { copied?: string });

const folderOf = (path: string): string => path.slice(0, Math.max(0, path.lastIndexOf("/")));

const join = (folder: string, name: string): string => (folder === "" ? name : `${folder}/${name}`);

const extensionOf = (path: string): string => {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
};

/** How the GEDCOM file spells a vault path, or null where that spelling would not lead back to it. */
export function fileTarget(documentPath: string, vaultPath: string, dialect: GedcomDialect | undefined): string | null {
  const payload = encodeFileTarget(relativeFilePath(documentPath, vaultPath), dialect);
  return resolveFileTarget(documentPath, payload, dialect) === vaultPath ? payload : null;
}

export function copyFolder(documentPath: string, current: string | undefined): string {
  return current === undefined ? join(folderOf(documentPath), "Media") : folderOf(current);
}

export function safeName(name: string): string {
  const safe = name.replace(/[\\/:*?"<>|]/gu, "-").trim();
  return safe === "" || safe.startsWith(".") ? `file${safe}` : safe;
}

export function availablePath(folder: string, name: string, taken: (path: string) => boolean): string {
  const first = join(folder, name);
  if (!taken(first)) {
    return first;
  }
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : "";
  for (let number = 1; ; number += 1) {
    const path = join(folder, `${stem} ${number}${extension}`);
    if (!taken(path)) {
      return path;
    }
  }
}

const MEDIA_TYPES: Readonly<Record<string, string>> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  avif: "image/avif",
  heic: "image/heic",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  pdf: "application/pdf",
  txt: "text/plain",
};

const OLD_EXTENSIONS: Readonly<Record<string, string>> = { jpeg: "jpg", tiff: "tif" };

const MEDIA_TYPE = /^[a-z]+\/[a-z0-9][\w.+-]*$/iu;

export function formFor(path: string, dialect: GedcomDialect | undefined, deviceType?: string): string {
  const extension = extensionOf(path);
  if (dialect === "7.0") {
    if (deviceType !== undefined && MEDIA_TYPE.test(deviceType)) {
      return deviceType.toLowerCase();
    }
    return MEDIA_TYPES[extension] ?? "application/octet-stream";
  }
  return OLD_EXTENSIONS[extension] ?? extension;
}

export function vaultFileChoices(paths: readonly string[], current: string | undefined): VaultFileChoice[] {
  const files = paths.filter((path) => !isGedcomPath(path));
  const byPath = (left: string, right: string): number => left.localeCompare(right);
  return [...files.filter(isImagePath).sort(byPath), ...files.filter((path) => !isImagePath(path)).sort(byPath)].map(
    (path) => ({ path, checked: path === current }),
  );
}

/**
 * The path of the file and, where the line states one, its format, asked of the service at one version
 * and joined into one edit: the format's line is beneath the file's, so the two never overlap.
 */
export function mediaFileEdit(
  service: GedcomLanguageService,
  documentPath: string,
  at: FileAt,
  vaultPath: string,
  version: number,
  deviceType?: string,
): StructureEditResult | Refusal {
  const dialect = service.getDocument().getDialect();
  const value = fileTarget(documentPath, vaultPath, dialect);
  if (value === null) {
    return { ok: false, code: OUT_OF_REACH, message: "The GEDCOM file cannot name this file from its folder." };
  }
  const file = service.setValue(at.file, { value }, version);
  return joinEdits(
    at.form === undefined || !file.ok ? [file] : [file, service.setValue(at.form, { value: formFor(vaultPath, dialect, deviceType) }, version)],
  );
}

export interface FileChoiceHost {
  documentPath: string;
  current: string | undefined;
  vaultFiles: () => string[];
  taken: (path: string) => boolean;
  check: (vaultPath: string, deviceType?: string) => Refusal | null;
  write: (vaultPath: string, deviceType?: string) => WriteOutcome;
  copy: (path: string, data: ArrayBuffer) => Promise<void>;
  chooseVaultFile: (choices: VaultFileChoice[], chosen: (path: string) => void) => void;
  chooseDeviceFile: (chosen: (file: File) => void) => void;
}

export function fileChoices(host: FileChoiceHost, done: (outcome: FileOutcome) => void): FieldChoice[] {
  const fromVault = (): void => {
    host.chooseVaultFile(vaultFileChoices(host.vaultFiles(), host.current), (path) => {
      done(host.write(path));
    });
  };
  const fromDevice = (): void => {
    host.chooseDeviceFile((file) => {
      const path = availablePath(copyFolder(host.documentPath, host.current), safeName(file.name), host.taken);
      const refusal = host.check(path, file.type);
      if (refusal) {
        done(refusal);
        return;
      }
      file
        .arrayBuffer()
        .then((data) => host.copy(path, data))
        .then(
          () => {
            const outcome = host.write(path, file.type);
            done(outcome.ok ? outcome : { ...outcome, copied: path });
          },
          () => {
            done({ ok: false, code: COPY_FAILED, message: "The file could not be copied into the vault." });
          },
        );
    });
  };
  return [
    { title: t("media.fromVault"), icon: "folder-open", disabled: false, choose: fromVault },
    { title: t("media.fromDevice"), icon: "upload", disabled: false, choose: fromDevice },
  ];
}
