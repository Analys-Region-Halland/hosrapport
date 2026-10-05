// kontrast.test.ts: WCAG 2.2-kontrast för färgerna i tema.ts (stilguiden 2.1–2.3 och 7).
//   Text ≥ 4,5:1 mot papper och yta (1.4.3).
//   Budskapsbärande grafik ≥ 3:1 mot yta (1.4.11): fokus, referens, kontextPunkt,
//   statusmarkörer och markeringsfärger.
//   Statusmarkörens chiptext ≥ 4,5:1 mot chipbotten.
// Kontextlinjerna (#D6D6D1) är undantagna enligt stilguiden 2.2.

import { describe, expect, it } from "vitest";
import { kontrast } from "./kontrast";
import { tema } from "./tema";

const { farg } = tema;
const statusar = Object.entries(farg.status);

const textfarger: [string, string][] = [
  ["farg.black", farg.black],
  ["farg.text2", farg.text2],
  ["farg.text3", farg.text3],
  ["farg.fokus", farg.fokus],
  ["farg.diagram.axeltext", farg.diagram.axeltext],
  ["farg.diagram.referens (etikett)", farg.diagram.referens],
  ...statusar.map(([s, f]): [string, string] => [`farg.status.${s}.text`, f.text]),
];

const grafik: [string, string][] = [
  ["farg.diagram.fokus", farg.diagram.fokus],
  ["farg.diagram.referens", farg.diagram.referens],
  ["farg.diagram.kontextPunkt", farg.diagram.kontextPunkt],
  ...statusar.map(([s, f]): [string, string] => [`farg.status.${s}.markor`, f.markor]),
  ...farg.diagram.markering.map((f, i): [string, string] => [`farg.diagram.markering[${i}]`, f]),
];

describe("kontrast", () => {
  it("räknar som WCAG (svart mot vitt = 21:1)", () => {
    expect(kontrast("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(kontrast("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  for (const [namn, f] of textfarger) {
    for (const [bakgrund, b] of [["papper", farg.papper], ["yta", farg.yta]] as const) {
      it(`text ${namn} mot ${bakgrund} ≥ 4,5:1`, () => {
        expect(kontrast(f, b)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  for (const [namn, f] of grafik) {
    it(`grafik ${namn} mot yta ≥ 3:1`, () => {
      expect(kontrast(f, farg.yta)).toBeGreaterThanOrEqual(3);
    });
  }

  for (const [s, f] of statusar) {
    it(`chiptext ${s} mot chipbotten ≥ 4,5:1`, () => {
      expect(kontrast(f.text, f.botten)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("fokusringen syns mot papper och yta (≥ 3:1)", () => {
    expect(kontrast(farg.fokusring, farg.papper)).toBeGreaterThanOrEqual(3);
    expect(kontrast(farg.fokusring, farg.yta)).toBeGreaterThanOrEqual(3);
  });
});
