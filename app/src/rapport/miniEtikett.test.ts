import { describe, expect, it } from "vitest";
import { placeraEtiketter, strackaKorsar, type Ruta } from "./miniEtikett";

const YTA: Ruta = { x0: 0, y0: 0, x1: 200, y1: 120 };

describe("strackaKorsar", () => {
  const r: Ruta = { x0: 10, y0: 10, x1: 20, y1: 20 };
  it("ser en sträcka genom rutan", () => expect(strackaKorsar(0, 15, 30, 15, r)).toBe(true));
  it("ser en sträcka bredvid rutan", () => expect(strackaKorsar(0, 25, 30, 25, r)).toBe(false));
  it("ser en sträcka som slutar före rutan", () => expect(strackaKorsar(0, 15, 8, 15, r)).toBe(false));
});

describe("placeraEtiketter", () => {
  it("ställer etiketten ovanför när linjen går nedåt från punkten", () => {
    const linje: [number, number][] = [[10, 40], [100, 80], [190, 100]];
    const [p] = placeraEtiketter([{ punkt: [10, 40], radie: 4, bredd: 40, ankare: "start" }], linje, YTA);
    expect(p.ruta.y1).toBeLessThanOrEqual(40);
  });

  it("ställer etiketten under när linjen går uppåt från punkten", () => {
    const linje: [number, number][] = [[10, 60], [100, 20], [190, 10]];
    const [p] = placeraEtiketter([{ punkt: [10, 60], radie: 4, bredd: 40, ankare: "start" }], linje, YTA);
    expect(p.ruta.y0).toBeGreaterThanOrEqual(60);
  });

  it("korsar aldrig linjen när det finns ett fritt läge, och håller sig inom ytan", () => {
    const linje: [number, number][] = [[10, 60], [60, 20], [110, 100], [160, 30], [190, 115]];
    const [sista, forsta] = placeraEtiketter([
      { punkt: [190, 115], radie: 5, bredd: 44, ankare: "end" },
      { punkt: [10, 60], radie: 4, bredd: 44, ankare: "start" },
    ], linje, YTA);
    for (const p of [sista, forsta]) {
      expect(p.ruta.y0).toBeGreaterThanOrEqual(YTA.y0);
      expect(p.ruta.y1).toBeLessThanOrEqual(YTA.y1);
      for (let i = 1; i < linje.length; i++) {
        expect(strackaKorsar(...linje[i - 1], ...linje[i], p.ruta)).toBe(false);
      }
    }
  });

  it("drar en connector när etiketten står en bit från punkten", () => {
    // Punkten längst ned i högra hörnet med en vågrät linje strax ovanför:
    // nära ovanför korsar linjen, under får inte plats
    const linje: [number, number][] = [[100, 95], [150, 95], [190, 112]];
    const [p] = placeraEtiketter([{ punkt: [190, 112], radie: 5, bredd: 40, ankare: "end" }], linje, YTA);
    expect(p.connector).not.toBeNull();
  });
});
