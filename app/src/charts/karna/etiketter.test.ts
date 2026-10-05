import { describe, expect, it } from "vitest";
import { tema } from "../../design/tema";
import { hogermarginal, placeraEtiketter, type EtikettUnderlag } from "./etiketter";

const e = (serieId: string, ankarY: number, prioritet = 1, text = serieId): EtikettUnderlag => ({
  serieId, text, ankarY, farg: tema.farg.text3, vikt: 400, interaktiv: false, prioritet,
});
const min = tema.diagram.etikett.minAvstand;

describe("etikettkolumnen", () => {
  it("håller etiketterna minst 17 px isär och nära sina linjeslut", () => {
    const ut = placeraEtiketter([e("a", 100), e("b", 104), e("c", 106), e("d", 200)], 10, 300, 800);
    const y = ut.map((x) => x.y).sort((a, b) => a - b);
    for (let i = 1; i < y.length; i++) expect(y[i] - y[i - 1]).toBeGreaterThanOrEqual(min - 1e-9);
    expect(ut.find((x) => x.serieId === "d")!.y).toBe(200);
    // klustret a–c centreras kring sina linjeslut
    const kluster = ut.filter((x) => x.serieId !== "d").map((x) => x.y);
    expect(Math.abs(kluster.reduce((s, v) => s + v, 0) / 3 - (100 + 104 + 106) / 3)).toBeLessThan(1e-6);
  });

  it("stannar inom gränserna", () => {
    const ut = placeraEtiketter([e("a", 2), e("b", 3), e("c", 4)], 10, 300, 800);
    expect(Math.min(...ut.map((x) => x.y))).toBeGreaterThanOrEqual(10);
    const ut2 = placeraEtiketter([e("a", 298), e("b", 299), e("c", 300)], 10, 300, 800);
    expect(Math.max(...ut2.map((x) => x.y))).toBeLessThanOrEqual(300);
  });

  it("tar bort etiketter med lägst prioritet när kolumnen inte rymmer alla", () => {
    const lista = [e("fokus", 50, 6), e("riket", 52, 5), e("hog", 51, 1), e("lag", 53, 0)];
    const ut = placeraEtiketter(lista, 0, 2 * min, 800);
    expect(ut.map((x) => x.serieId).sort()).toEqual(["fokus", "hog", "riket"].sort());
  });

  it("kortar namn med ellips i smala diagram och marginalen är högst 34 %", () => {
    const lang = [{ text: "Västra Götalandsregionen", vikt: 400 }];
    expect(hogermarginal(lang, 320)).toBeLessThanOrEqual(320 * 0.34 + 1e-9);
    const ut = placeraEtiketter([e("vg", 100, 1, "Västra Götalandsregionen")], 0, 300, 320);
    expect(ut[0].rader).toHaveLength(1);
    expect(ut[0].rader[0].endsWith("…")).toBe(true);
    const bred = placeraEtiketter([e("vg", 100, 1, "Västra Götalandsregionen")], 0, 300, 880);
    expect(bred[0].rader).toEqual(["Västra Götalandsregionen"]);
  });

  it("bryter på två rader när båda raderna ryms, och ger dem dubbel höjd", () => {
    const ut = placeraEtiketter([e("band", 100, 4, "Förväntat intervall"), e("fokus", 104, 6, "Halland")], 0, 300, 326);
    const band = ut.find((x) => x.serieId === "band")!;
    const fokus = ut.find((x) => x.serieId === "fokus")!;
    expect(band.rader).toEqual(["Förväntat", "intervall"]);
    // två rader (2 × 17) och en rad (17): mittpunkterna minst 25,5 px isär
    expect(Math.abs(band.y - fokus.y)).toBeGreaterThanOrEqual(1.5 * min - 1e-9);
  });
});
