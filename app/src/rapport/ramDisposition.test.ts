import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { KapitelModell, KpiModell } from "../data/modell";
import { KAPITELBLOCK } from "../nav/route";
import { normalisera } from "../data/normalisera";
import { kapitelIndex, vyForKapitel } from "./ramData";
import { byggDisposition, hittaPosition, positionsdelar } from "./ramDisposition";

const data = (fil: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../public/data/${fil}`, import.meta.url)), "utf8"));

const kpi = (id: string, namn: string, status: KpiModell["status"] = "gron"): KpiModell => ({
  id, namn, status, format: { enhet: "procent", decimaler: 1, etikett: "%" }, aggregering: "andel",
  riktning: "hog", fokus: "0013", serier: {}, analystext: "", noter: [],
});

const kapitel = (over: Partial<KapitelModell> = {}): KapitelModell => ({
  id: "k", namn: "Kapitel", huvudpunkter: [], enheter: [], avsnitt: [], kpier: [],
  om_statistiken: [], kallor: [], leverans: [], ...over,
});

describe("disposition", () => {
  const tillg = byggDisposition(normalisera(data("ar-skr-tillganglighet.json"), "ar"));

  it("numrerar avsnitt och indikatorer som rapporten", () => {
    expect(tillg.avsnitt.map((a) => `${a.nummer} ${a.namn}`)).toEqual([
      "1 Primärvårdens tillgänglighet",
      "2 Vårdgarantin i specialiserad vård",
      "3 Psykiatrisk vård",
      "4 Standardiserade vårdförlopp vid cancer",
    ]);
    expect(tillg.avsnitt[1].indikatorer.map((x) => x.nummer)).toEqual(["2.1", "2.2", "2.3", "2.4"]);
    expect(tillg.indikatorer).toEqual([]);
  });

  it("positionsraden: avsnitt › indikator", () => {
    expect(positionsdelar(tillg, "kolada-n79223").map((d) => d.text)).toEqual([
      "2 Vårdgarantin i specialiserad vård",
      "2.3 Väntande högst 90 dagar på operation/åtgärd i specialiserad vård",
    ]);
    expect(positionsdelar(tillg, "tillg-psykiatri").map((d) => d.text)).toEqual(["3 Psykiatrisk vård"]);
  });

  it("ovanför första blocket och för okänt block visas kapitlets namn", () => {
    expect(positionsdelar(tillg, "")).toEqual([{ id: "skr-tillganglighet", text: "Tillgänglighet och väntetider" }]);
    expect(positionsdelar(tillg, "finns-inte")[0].text).toBe("Tillgänglighet och väntetider");
  });

  it("block på kapitelnivå: Läget i korthet före, Om statistiken efter; Det viktigaste bara med huvudpunkter", () => {
    expect(tillg.fore.map((b) => b.id)).toEqual([KAPITELBLOCK.viktigast, KAPITELBLOCK.laget]);
    expect(tillg.efter.map((b) => b.id)).toEqual([KAPITELBLOCK.om]);
    expect(positionsdelar(tillg, KAPITELBLOCK.om)).toEqual([{ id: KAPITELBLOCK.om, text: "Om statistiken" }]);
    const med = byggDisposition(kapitel({ kpier: [kpi("a", "A")], huvudpunkter: [{ text: "x", ton: "neutral" }] }));
    expect(med.fore.map((b) => b.namn)).toEqual(["Det viktigaste", "Läget i korthet"]);
    expect(byggDisposition(kapitel()).fore).toEqual([]);
  });

  it("kapitel utan avsnitt numrerar indikatorerna direkt", () => {
    const akut = byggDisposition(normalisera(data("manad-akutflode.json"), "manad"));
    expect(akut.avsnitt).toEqual([]);
    expect(akut.indikatorer.map((x) => `${x.nummer} ${x.namn}`)).toEqual([
      "1 Beläggningsgrad", "2 Besök akutmottagning", "3 Medianväntetid akut", "4 Ambulansuppdrag",
    ]);
    expect(positionsdelar(akut, "vantetid").map((d) => d.text)).toEqual(["3 Medianväntetid akut"]);
    expect(hittaPosition(akut, "vantetid").avsnitt).toBeUndefined();
  });

  it("indikatorer som saknas i kpier hoppas över utan hål i numreringen", () => {
    const d = byggDisposition(kapitel({
      kpier: [kpi("a", "A", "gul"), kpi("c", "C", null)],
      avsnitt: [{ id: "s", namn: "S", kpi_ids: ["a", "b", "c"] }],
    }));
    expect(d.avsnitt[0].indikatorer).toEqual([
      { id: "a", nummer: "1.1", namn: "A", status: "gul" },
      { id: "c", nummer: "1.2", namn: "C", status: null },
    ]);
  });
});

describe("kapitellistan ur manifestet", () => {
  const index = kapitelIndex(data("index.json"));

  it("kapitlen i årsvyns ordning med sina vyer", () => {
    expect(index.kapitel.map((k) => k.id)).toEqual([
      "skr-syn-pa-varden", "skr-tillganglighet", "skr-saker-vard", "skr-kunskapsbaserad",
      "skr-sjukdomsforekomst", "skr-kostnader", "akutflode",
    ]);
    expect(index.kapitel.find((k) => k.id === "akutflode")?.vyer).toEqual(["dag", "vecka", "manad", "kvartal", "ar"]);
    expect(index.kapitel.find((k) => k.id === "skr-kostnader")?.vyer).toEqual(["ar"]);
    expect(index.period.ar).toBe("2025");
  });

  it("vyForKapitel faller tillbaka på standardvyn och okänt kapitel ger undefined", () => {
    expect(vyForKapitel(index, "akutflode", "manad")).toBe("manad");
    expect(vyForKapitel(index, "skr-kostnader", "manad")).toBe("ar");
    expect(vyForKapitel(index, "finns-inte", "ar")).toBeUndefined();
  });

  it("tål ett tomt eller trasigt manifest", () => {
    expect(kapitelIndex({})).toEqual({ kapitel: [], period: {} });
    expect(kapitelIndex({ ar: "fel", manad: { sektioner: "fel" } } as never).kapitel).toEqual([]);
  });
});
