import { EditorState } from "@codemirror/state";
import { afterEach, describe, expect, it } from "vitest";

import { resetLanguage, setLanguage } from "../i18n";
import { createHostEditorExtensions } from "./hostExtensions";

afterEach(resetLanguage);

const state = (): EditorState =>
  EditorState.create({
    doc: "0 HEAD\n",
    extensions: createHostEditorExtensions({ diagnostics: true }, false, {
      setIcon: () => undefined,
      pushScope: () => () => undefined,
      mac: false,
    }),
  });

describe("what CodeMirror says on the plugin's behalf", () => {
  it("is CodeMirror's own English under English", () => {
    expect(state().phrase("No diagnostics")).toBe("No diagnostics");
    expect(state().phrase("folded code")).toBe("folded code");
  });

  it("is Russian under Russian", () => {
    setLanguage("ru");
    expect(state().phrase("Diagnostics")).toBe("Проблемы");
    expect(state().phrase("No diagnostics")).toBe("Проблем нет");
    expect(state().phrase("close")).toBe("закрыть");
    expect(state().phrase("folded code")).toBe("свёрнутые строки");
    expect(state().phrase("unfold")).toBe("развернуть");
    expect(state().phrase("Completions")).toBe("Автодополнение");
  });
});
