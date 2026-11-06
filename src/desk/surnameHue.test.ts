import { describe, expect, it } from "vitest";

import { surnamePaint, contrastOnFill, hueDistance, surnameHue } from "./surnameHue";

const apart = (a: string, b: string): number => hueDistance(surnameHue(a), surnameHue(b));

describe("the hue of a surname", () => {
  it("keeps the two genders of a surname almost together", () => {
    expect(apart("Лобанов", "Лобанова")).toBeLessThan(3);
    expect(apart("Petrov", "Petrova")).toBeLessThan(3);
    expect(apart("Ковалевский", "Ковалевская")).toBeLessThan(3);
  });

  it("keeps a Cyrillic surname and its Latin spelling almost together", () => {
    expect(apart("Жуков", "Zhukov")).toBeLessThan(3);
  });

  it("reads я, ю and a leading й as ya, yu and y", () => {
    expect(apart("Юрьев", "Yuriev")).toBeLessThan(3);
    expect(apart("Яковлев", "Yakovlev")).toBeLessThan(3);
    expect(apart("Йорк", "York")).toBeLessThan(3);
  });

  it("lets a different third letter move the hue by tens of degrees", () => {
    expect(apart("Лобанов", "Lomonosov")).toBeGreaterThanOrEqual(10);
    expect(apart("Smith", "Smyth")).toBeGreaterThanOrEqual(10);
  });

  it("puts surnames with little in common far apart", () => {
    expect(apart("Лобанов", "Сидорова")).toBeGreaterThan(50);
    expect(apart("Abramov", "Eliseev")).toBeGreaterThan(50);
  });

  it("takes a hyphenated surname whole", () => {
    expect(apart("Skłodowska-Curie", "Joliot-Curie")).toBeGreaterThan(50);
  });

  it("ignores case and marks on letters", () => {
    expect(surnameHue("SKŁODOWSKA")).toBe(surnameHue("skłodowska"));
    expect(surnameHue("Żorawski")).toBe(surnameHue("zorawski"));
    expect(surnameHue("Hélène")).toBe(surnameHue("Helene"));
  });

  it("is the same on every call and stays on the circle", () => {
    expect(surnameHue("Curie")).toBe(surnameHue("Curie"));
    for (const name of ["A", "Zzzz", "Ли", "王", "Zukowski", "ıx"]) {
      const hue = surnameHue(name);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });
});

describe("the paint of a bar", () => {
  it("is grey where there is no surname, and coloured where there is", () => {
    expect(surnamePaint(undefined)["--gedcom-surname-fill-light"]).toMatch(/ 0% /);
    expect(surnamePaint("Curie")["--gedcom-surname-fill-light"]).not.toMatch(/ 0% /);
  });

  it("is the same for the same surname", () => {
    expect(surnamePaint("Curie")).toEqual(surnamePaint("Curie"));
  });

  it("gives a name 4.5:1 on every hue, in both schemes", () => {
    for (let hue = 0; hue < 360; hue += 1) {
      for (const scheme of ["light", "dark"] as const) {
        expect(contrastOnFill(hue, scheme), `${hue} ${scheme}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(contrastOnFill(0, "light", true)).toBeGreaterThanOrEqual(4.5);
    expect(contrastOnFill(0, "dark", true)).toBeGreaterThanOrEqual(4.5);
  });
});
