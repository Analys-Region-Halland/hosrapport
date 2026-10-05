// Tester för träffreglerna som WP3 lade till i interaktion.ts: rader
// (rangordning) och paneler (små multiplar), och måtten som flyttades till
// tema.diagram.

import { describe, expect, it } from "vitest";
import { tema } from "../../design/tema";
import type { ChartSpec } from "../spec";
import type { Scen, ScenPanel, Stopp } from "../register";
import { GEOMETRI } from "./geometri";
import {
  byggPanelmodell, byggRadmodell, panelPeriod, panelStart, panelTangent, panelVid, radStart, radTangent, radVid,
} from "./interaktion";
import { STANDARDREGLER } from "./traff";

const tomScen = (over: Partial<Scen>): Scen => ({
  bredd: 600, hojd: 300, plot: { x: 100, y: 20, b: 400, h: 240 },
  xTicks: [], yTicks: [], lager: [], etiketter: [], stopp: [], ...over,
});

/** Tio rader, 24 px höga, med början 20 px ned. */
const rader: Stopp[] = Array.from({ length: 10 }, (_, i) => ({ serieId: `r${i}`, index: i, x: 150 + i * 20, y: 20 + 24 * (i + 0.5), varde: 100 - i }));
const radSpec = {
  serier: rader.map((r, i) => ({ id: r.serieId, namn: r.serieId, roll: i === 4 ? "fokus" : "kontext", varde: r.varde, interaktiv: i !== 4 })),
} as unknown as ChartSpec;

describe("träffregeln för rader", () => {
  const m = byggRadmodell(tomScen({ stopp: [...rader].reverse() }));

  it("raderna i ordning uppifrån och halva radhöjden", () => {
    expect(m.rader.map((r) => r.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(m.halv).toBe(12);
  });

  it("raden under pekaren är närmaste rad i höjdled, hela raden räknas", () => {
    expect(radVid(m, 300, 32)).toBe(0);
    expect(radVid(m, 2, 32)).toBe(0);           // på namnet längst till vänster
    expect(radVid(m, 598, 32)).toBe(0);         // längst till höger
    expect(radVid(m, 300, 20 + 24 * 3 + 1)).toBe(3);
    expect(radVid(m, 300, 20 + 24 * 3 - 1)).toBe(2);
  });

  it("ingen lucka mellan raderna och inget utanför dem", () => {
    for (let py = 20; py <= 260; py += 0.5) expect(radVid(m, 300, py), String(py)).not.toBeNull();
    expect(radVid(m, 300, 19)).toBeNull();
    expect(radVid(m, 300, 261)).toBeNull();
    expect(radVid(m, -1, 50)).toBeNull();
    expect(radVid(m, 601, 50)).toBeNull();
  });

  it("tangentbord: start på fokus, ↑ ↓ mellan rader, Home/End, Enter fäster, Escape stänger", () => {
    const start = radStart(m, radSpec);
    expect(start).toEqual({ index: 4, serieId: "r4" });
    let a = radTangent("ArrowDown", m, radSpec, start).aktiv;
    expect(a).toEqual({ index: 5, serieId: "r5" });
    a = radTangent("ArrowUp", m, radSpec, a).aktiv;
    a = radTangent("ArrowUp", m, radSpec, a).aktiv;
    expect(a?.index).toBe(3);
    expect(radTangent("Home", m, radSpec, a).aktiv?.index).toBe(0);
    expect(radTangent("End", m, radSpec, a).aktiv?.index).toBe(9);
    expect(radTangent("ArrowUp", m, radSpec, { index: 0, serieId: "r0" }).aktiv?.index).toBe(0);
    expect(radTangent("ArrowDown", m, radSpec, { index: 9, serieId: "r9" }).aktiv?.index).toBe(9);
    expect(radTangent("Enter", m, radSpec, { index: 2, serieId: "r2" }).vaxla).toBe("r2");
    expect(radTangent("Enter", m, radSpec, { index: 4, serieId: "r4" }).vaxla).toBeUndefined();
    expect(radTangent("Escape", m, radSpec, { index: 2, serieId: "r2" })).toEqual({ hanterad: true, aktiv: null });
    expect(radTangent("ArrowLeft", m, radSpec, { index: 2, serieId: "r2" }).hanterad).toBe(false);
  });
});

describe("träffregeln för paneler", () => {
  /** Två kolumner och två rader, 24 px luft i sidled och 32 i höjdled. */
  const panel = (nr: number): ScenPanel => {
    const x = 40 + (nr % 2) * (200 + 24), y = Math.floor(nr / 2) * (220 + 32);
    const plot = { x, y: y + 40, b: 180, h: 140 };
    const stopp: Stopp[] = Array.from({ length: 5 }, (_, i) => ({ serieId: `p${nr}`, index: i, x: plot.x + i * 45, y: plot.y + 70, varde: i }));
    return { serieId: `p${nr}`, enhetId: `e${nr}`, x, y, b: 200, h: 220, plot, namn: { text: `P${nr}`, x, y, b: 30, h: 24 }, stopp };
  };
  const m = byggPanelmodell(tomScen({ bredd: 464, hojd: 472, paneler: [0, 1, 2, 3].map(panel) }));

  it("perioderna är gemensamma och luften delas mitt itu", () => {
    expect(m.perioder.map((p) => p.dx)).toEqual([0, 45, 90, 135, 180]);
    expect(m.luft).toEqual({ x: 12, y: 16 });
  });

  it("panelen under pekaren, även i luften mellan två paneler", () => {
    expect(panelVid(m, 100, 100)?.serieId).toBe("p0");
    expect(panelVid(m, 300, 100)?.serieId).toBe("p1");
    expect(panelVid(m, 251, 100)?.serieId).toBe("p0");   // luften till höger om p0
    expect(panelVid(m, 253, 100)?.serieId).toBe("p1");
    expect(panelVid(m, 100, 300)?.serieId).toBe("p2");
    expect(panelVid(m, 100, 500)).toBeNull();
  });

  it("samma period i alla paneler (synkroniserad hjälplinje)", () => {
    const p0 = m.paneler[0], p3 = m.paneler[3];
    expect(panelPeriod(m, p0, p0.plot.x + 92)).toBe(2);
    expect(panelPeriod(m, p3, p3.plot.x + 92)).toBe(2);
  });

  it("tangentbord: ← → perioder, ↑ ↓ paneler, Enter borrar ned bara när figuren kan", () => {
    const start = panelStart(m);
    expect(start).toEqual({ index: 4, serieId: "p0" });
    expect(panelTangent("ArrowLeft", m, start, false).aktiv).toEqual({ index: 3, serieId: "p0" });
    expect(panelTangent("ArrowDown", m, start, false).aktiv).toEqual({ index: 4, serieId: "p1" });
    expect(panelTangent("Home", m, start, false).aktiv?.index).toBe(0);
    expect(panelTangent("Enter", m, { index: 2, serieId: "p3" }, true).fokus).toBe("e3");
    expect(panelTangent("Enter", m, { index: 2, serieId: "p3" }, false).fokus).toBeUndefined();
    expect(panelTangent("Escape", m, start, false).aktiv).toBeNull();
  });
});

describe("måtten i tema.diagram", () => {
  it("kärnans mått läses ur tema och har samma värden som förut", () => {
    expect(GEOMETRI.axelrad).toBe(tema.diagram.xAxel.hojd);
    expect(GEOMETRI.axelrad).toBe(34);
    expect(GEOMETRI.xEtikettBaslinje).toBe(20);
    expect(GEOMETRI.koppling).toEqual({ start: 6, knack: 12, slut: 18 });
    expect(GEOMETRI.overlaggPunkt).toEqual({ radie: 4, kant: 1.5 });
    expect(GEOMETRI.pekskarmLyft).toBe(12);
    expect(STANDARDREGLER).toEqual({ lyft: 8, slapp: 14, byte: 4, foretrade: 2 });
    expect(GEOMETRI.tooltipHelBreddUnder).toBe(560);
  });
});
