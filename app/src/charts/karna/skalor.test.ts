import { describe, expect, it } from "vitest";
import { hardledSteg, periodRutnat, tidsTicks, vardeTicks, type Tidsaxel } from "./skalor";

const axel = (perioder: string[]): Tidsaxel => {
  const r = periodRutnat(perioder);
  return { perioder: r.perioder, vy: r.vy, index: new Map(r.perioder.map((p, i) => [p, i])) };
};
const ar = (a0: number, a1: number) => Array.from({ length: a1 - a0 + 1 }, (_, i) => `${a0 + i}-01-01`);
const manader = (fran: string, antal: number) => {
  const [a, m] = fran.split("-").map(Number);
  return Array.from({ length: antal }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 + i, 1));
    return d.toISOString().slice(0, 10);
  });
};

describe("periodrutnät", () => {
  it("härleder steget och fyller luckor per periodsteg", () => {
    const r = periodRutnat(["2016-01-01", "2017-01-01", "2022-01-01", "2025-01-01"]);
    expect(r.vy).toBe("ar");
    expect(r.perioder).toEqual(ar(2016, 2025));
  });
  it("känner igen månad, kvartal, vecka och dag", () => {
    expect(hardledSteg(manader("2021-01", 6))).toBe("manad");
    expect(hardledSteg(["2021-01-01", "2021-04-01", "2021-07-01"])).toBe("kvartal");
    expect(hardledSteg(["2026-03-02", "2026-03-09", "2026-03-16"])).toBe("vecka");
    expect(hardledSteg(["2026-03-01", "2026-03-02"])).toBe("dag");
  });
});

describe("värdeaxelns ticks", () => {
  const fall: [number, number][] = [[61.5, 100], [0.3, 7.9], [12345, 98765], [-3.2, 4.1], [88.1, 88.9], [34371, 41020], [5, 5]];
  for (const [min, max] of fall) {
    for (const smal of [false, true]) {
      it(`omsluter datan ${min}–${max}${smal ? " (smal)" : ""}`, () => {
        const { ticks, steg } = vardeTicks(min, max, smal);
        expect(ticks[0]).toBeLessThanOrEqual(min);
        expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(max);
        // ingen tom gridlinje utanför: översta minus ett steg ligger under max
        if (min !== max) {
          expect(ticks[ticks.length - 1] - steg).toBeLessThan(max);
          expect(ticks[0] + steg).toBeGreaterThan(min);
        }
        const [lo, hi] = smal ? [3, 4] : [4, 6];
        if (min !== max) expect(ticks.length).toBeGreaterThanOrEqual(lo - 1);
        expect(ticks.length).toBeLessThanOrEqual(hi + 1);
      });
    }
  }
  it("ger prototypens 60–100 för telefontillgängligheten", () => {
    expect(vardeTicks(61.5, 100, false).ticks).toEqual([60, 70, 80, 90, 100]);
  });
  it("väljer det steg som slösar minst höjd (42–146 ger 25–150, inte 0–150)", () => {
    expect(vardeTicks(42, 146, false).ticks).toEqual([25, 50, 75, 100, 125, 150]);
    expect(vardeTicks(61.5, 100, true).ticks).toEqual([60, 80, 100]);
  });
  it("tar med noll när axeln kräver det", () => {
    expect(vardeTicks(24000, 32000, false, true).ticks[0]).toBe(0);
  });
});

describe("tidsaxelns etiketter", () => {
  const x = (bredd: number, n: number) => (i: number) => 40 + (i * (bredd - 80)) / Math.max(1, n - 1);
  it("år: första, vart femte och sista året", () => {
    const a = axel(ar(2016, 2025));
    expect(tidsTicks(a, x(800, 10)).map((t) => t.text)).toEqual(["2016", "2020", "2025"]);
  });
  it("år: krockar inte i smala diagram", () => {
    const a = axel(ar(2019, 2025));
    const t = tidsTicks(a, x(200, 7)).map((tk) => tk.text);
    expect(t[0]).toBe("2019");
    expect(t[t.length - 1]).toBe("2025");
    expect(t).not.toContain("2020");
  });
  it("månad: januari varje år; sista månaden utelämnas när den krockar", () => {
    const a = axel(manader("2021-01", 63)); // jan 21–mar 26
    const t = tidsTicks(a, x(800, 63)).map((tk) => tk.text);
    // mar 26 krockar med jan 26 (två månader isär) och utelämnas
    expect(t).toEqual(["jan 21", "jan 22", "jan 23", "jan 24", "jan 25", "jan 26"]);
  });
  it("månad: första månaden står med när den inte krockar med januari", () => {
    const a = axel(manader("2024-04", 24)); // apr 24–mar 26
    const t = tidsTicks(a, x(800, 24)).map((tk) => tk.text);
    expect(t[0]).toBe("apr 24");
    expect(t).toContain("jan 25");
  });
  it("vecka över flera år: vecka 1 varje år med året", () => {
    const veckor = Array.from({ length: 160 }, (_, i) => new Date(Date.UTC(2020, 11, 28) + i * 7 * 86_400_000).toISOString().slice(0, 10));
    const t = tidsTicks(axel(veckor), x(800, 160)).map((tk) => tk.text);
    expect(t).toContain("v. 1 2022");
    expect(t.every((s) => /\d{4}$/.test(s))).toBe(true);
  });
  it("etiketterna överlappar aldrig", () => {
    for (const bredd of [260, 400, 832]) {
      const a = axel(manader("2021-01", 63));
      const t = tidsTicks(a, x(bredd, 63));
      for (let i = 1; i < t.length; i++) expect(t[i].x - t[i - 1].x).toBeGreaterThan(30);
    }
  });
});
