import { afterEach, describe, expect, it } from "vitest";

import { resetLanguage, setLanguage } from "../i18n";
import { curieIndex } from "../testing/curie";
import { placesOf, timelineOf } from "./timeline";

afterEach(resetLanguage);

const index = curieIndex();
const of = (xref: string) => {
  const person = index.person(xref);
  if (!person) {
    throw new Error(`no person ${xref}`);
  }
  return timelineOf(person, index);
};

describe("a person's timeline", () => {
  it("runs Marie's life from her parents' marriage to her death", () => {
    expect(of("@I1@").entries.map((entry) => [entry.year, entry.label])).toEqual([
      [1860, "Marriage of parents"],
      [1862, "Birth of sister Zofia Skłodowska"],
      [1863, "Birth of brother Józef Skłodowski"],
      [1865, "Birth of sister Bronisława Dłuska"],
      [1866, "Birth of sister Helena Szalay"],
      [1867, "Birth"],
      [1876, "Death of sister Zofia Skłodowska"],
      [1878, "Death of mother Bronisława Boguska"],
      [1895, "Marriage with Pierre Curie"],
      [1897, "Birth of daughter Irène Joliot-Curie"],
      [1902, "Death of father Władysław Skłodowski"],
      [1904, "Birth of daughter Ève Curie"],
      [1906, "Death of husband Pierre Curie"],
      [1926, "Marriage of daughter Irène Joliot-Curie"],
      [1927, "Birth of granddaughter Hélène Langevin-Joliot"],
      [1932, "Birth of grandson Pierre Joliot"],
      [1934, "Death"],
    ]);
  });

  it("tells the person's own entries from their relatives'", () => {
    const own = of("@I1@").entries.filter((entry) => entry.own).map((entry) => entry.fact);

    expect(own).toEqual(["p:0", "u:0:0", "p:1"]);
  });

  it("leaves out a relative's event after the person's death", () => {
    expect(of("@I1@").entries.map((entry) => entry.label)).not.toContain(
      "Death of daughter Irène Joliot-Curie",
    );
  });

  it("lists an undated event of the person's apart", () => {
    expect(of("@I1@").undated.map((entry) => entry.label)).toEqual(["Occupation"]);
  });

  it("names relatives by their relationship in Russian", () => {
    setLanguage("ru");

    expect(of("@I1@").entries.slice(0, 2).map((entry) => entry.label)).toEqual([
      "Брак родителей",
      "Рождение сестры Zofia Skłodowska",
    ]);
  });

  it("opens a relative from their entry", () => {
    const entry = of("@I1@").entries.find((one) => one.label.startsWith("Death of husband"));

    expect(entry?.relative).toEqual({ xref: "@I2@", name: "Pierre Curie" });
  });
});

describe("a person's places", () => {
  it("lists each place once, with what happened there", () => {
    const places = placesOf(of("@I1@"));

    expect(places.map((one) => one.place)).toEqual([
      "Warsaw, Congress Poland",
      "Sceaux, France",
      "Paris, France",
      "Passy, Haute-Savoie, France",
    ]);
    expect(places[0]?.events).toContain("Birth");
    expect(places[1]?.events).toEqual(["Marriage with Pierre Curie"]);
  });
});
