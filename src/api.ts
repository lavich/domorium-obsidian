import {
  GedcomLanguageService,
  type CreateDocumentOptions,
  type GedcomDocument,
} from "@domorium/language-service";

export const API_VERSION = "1.0.0";

export interface GedcomApi {
  readonly version: string;
  parse(text: string, options?: CreateDocumentOptions): GedcomDocument;
  read(path: string): Promise<GedcomDocument>;
}

export interface VaultFile {
  text: string;
  /** Anything that changes when the file does. */
  revision: string;
}

export interface VaultReader {
  read(path: string): Promise<VaultFile | null>;
}

export function createGedcomApi(vault: VaultReader): GedcomApi {
  const parsed = new Map<string, { revision: string; document: GedcomDocument }>();

  const parse = (
    text: string,
    options?: CreateDocumentOptions,
  ): GedcomDocument =>
    new GedcomLanguageService(text, undefined, options).getDocument();

  return {
    version: API_VERSION,
    parse,
    async read(path: string): Promise<GedcomDocument> {
      const file = await vault.read(path);
      if (!file) {
        throw new Error(`No GEDCOM file at ${path}`);
      }
      const cached = parsed.get(path);
      if (cached?.revision === file.revision) {
        return cached.document;
      }
      const document = parse(file.text);
      parsed.set(path, { revision: file.revision, document });
      return document;
    },
  };
}
