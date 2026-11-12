/** The input stays in the document while the picker is open: a detached one is not opened by every mobile webview. */
export function chooseDeviceFile(doc: Document, chosen: (file: File) => void): void {
  for (const stale of doc.body.querySelectorAll(":scope > .gedcom-device-file")) {
    stale.remove();
  }
  const input = doc.body.createEl("input", { cls: ["gedcom-device-file", "gedcom-visually-hidden"], attr: { type: "file", tabindex: "-1", "aria-hidden": "true" } });
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    input.remove();
    if (file) {
      chosen(file);
    }
  });
  input.addEventListener("cancel", () => {
    input.remove();
  });
  input.click();
}
