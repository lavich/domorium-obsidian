import { describe, expect, it } from "vitest";

import { GEDCOM_ICON_ID, GEDCOM_ICON_SVG } from "./icon";

describe("GEDCOM view icon", () => {
  it("uses a plugin-specific icon ID", () => {
    expect(GEDCOM_ICON_ID).toBe("domorium-tree");
  });

  it("contains the theme-aware Domorium tree geometry", () => {
    expect(GEDCOM_ICON_SVG).toContain('transform="scale(4.1666667)"');
    expect(GEDCOM_ICON_SVG).toContain('stroke="currentColor"');
    expect(GEDCOM_ICON_SVG.match(/<rect /g)).toHaveLength(4);
    expect(GEDCOM_ICON_SVG).toContain('d="M4 12v5M12 8v8M20 12v5"');
  });
});
