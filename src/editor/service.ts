import { GedcomLanguageService } from "@domorium/language-service";

export class EditorLanguageService {
  readonly service = new GedcomLanguageService();
  private text = "";

  update(text: string): GedcomLanguageService {
    if (text !== this.text) {
      this.text = text;
      this.service.update(text);
    }
    return this.service;
  }

  clear(): void {
    this.text = "";
    this.service.update("");
  }
}
