import { linkButton } from "./dom";
import type { PageHost } from "./personPage";
import { placeId } from "./placeRows";

export interface EventDetail {
  date?: string;
  place?: string;
  text?: string;
  spouse?: string;
}

export function renderEventDetail(value: HTMLElement, { date, place, text, spouse }: EventDetail, host: Pick<PageHost, "openRecord">): boolean {
  let any = false;
  const separate = (): void => {
    if (any) {
      value.appendText(" · ");
    }
    any = true;
  };
  if (date) {
    separate();
    value.appendText(date);
  }
  if (place) {
    separate();
    linkButton(value, place, () => host.openRecord(placeId(place)));
  }
  for (const part of [text, spouse]) {
    if (part) {
      separate();
      value.appendText(part);
    }
  }
  return any;
}
