import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { kontraktVersion, valideraKontrakt } from "./kontrakt";
import type { RaManifest } from "./kontrakt";
import { HALLAND_ID, RIKET_ID } from "./modell";
import type { KapitelModell, Punkt, VyId } from "./modell";
import { arKronor, fyllLuckor, nastaPeriod, normalisera, periodRutnat, platser } from "./normalisera";
import { antalMeningar } from "../charts/text";

const DATA = fileURLToPath(new URL("../../public/data/", import.meta.url));
const EM_DASH = String.fromCharCode(0x2014);
const las = (fil: string): unknown => JSON.parse(readFileSync(DATA + fil, "utf8"));
const kapitelfiler = readdirSync(DATA).filter((f) => f.endsWith(".json") && f !== "index.json").sort();
const vyAv = (fil: string) => fil.split("-")[0] as VyId;
const modeller = new Map<string, KapitelModell>(kapitelfiler.map((f) => [f, normalisera(las(f), vyAv(f))]));
const modell = (fil: string) => modeller.get(fil) as KapitelModell;
const kpi = (fil: string, id: string) => {
  const k = modell(fil).kpier.find((x) => x.id === id);
  if (!k) throw new Error(`saknar ${id} i ${fil}`);
  return k;
};

/** Alla tal i ett objekt, rekursivt. */
function allaTal(v: unknown, ut: number[] = []): number[] {
  if (typeof v === "number") ut.push(v);
  else if (Array.isArray(v)) v.forEach((x) => allaTal(x, ut));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => allaTal(x, ut));
  return ut;
}

describe("datafilerna", () => {
  it("manifestet och de elva kapitelfilerna är tolv filer som hänger ihop", () => {
    const filer = readdirSync(DATA).filter((f) => f.endsWith(".json"));
    expect(filer).toHaveLength(12);
    const manifest = las("index.json") as RaManifest;
    expect(kontraktVersion(manifest)).toBe(1);
    const listade = Object.entries(manifest)
      .filter(([vy]) => vy !== "kontrakt_version")
      .flatMap(([vy, m]) => (typeof m === "object" ? m.sektioner.map((s) => `${vy}-${s.id}.json`) : []));
    expect(listade.sort()).toEqual(kapitelfiler);
  });
});

describe.each(kapitelfiler)("normalisera %s", (fil) => {
  const kap = modell(fil);
  const vy = vyAv(fil);

  it("filen följer kontraktet", () => {
    expect(valideraKontrakt(las(fil))).toEqual([]);
  });

  it("inga NaN eller oändliga tal", () => {
    const tal = allaTal(kap);
    expect(tal.length).toBeGreaterThan(0);
    expect(tal.filter((t) => !Number.isFinite(t))).toEqual([]);
  });

  it("Halland finns och är fokus i varje indikator", () => {
    expect(kap.enheter.find((e) => e.id === HALLAND_ID)).toMatchObject({ namn: "Region Halland", kortnamn: "Halland", niva: "region" });
    for (const k of kap.kpier) {
      expect(k.fokus).toBe(HALLAND_ID);
      expect(k.serier[HALLAND_ID]?.tidsserie.length).toBeGreaterThan(0);
    }
  });

  it("varje serie har en enhet", () => {
    const ids = new Set(kap.enheter.map((e) => e.id));
    for (const k of kap.kpier) for (const id of Object.keys(k.serier)) expect(ids.has(id), `${k.id}: ${id}`).toBe(true);
    for (const e of kap.enheter) if (e.parent_id) expect(ids.has(e.parent_id)).toBe(true);
  });

  it("perioderna är sorterade, ett steg i taget och lika i alla serier i en indikator", () => {
    const kontrollera = (serier: Punkt[][], steg: VyId, namn: string) => {
      const forsta = serier[0].map((p) => p.period);
      for (const s of serier) {
        expect(s.map((p) => p.period), namn).toEqual(forsta);
        for (let i = 1; i < s.length; i++) expect(s[i].period, `${namn} ${s[i - 1].period}`).toBe(nastaPeriod(s[i - 1].period, steg));
        for (const p of s) expect(p.varde === null || typeof p.varde === "number").toBe(true);
      }
    };
    for (const k of kap.kpier) {
      kontrollera(Object.values(k.serier).map((s) => s.tidsserie), vy, k.id);
      const dagar = Object.values(k.serier).map((s) => s.dagar).filter((d): d is Punkt[] => !!d);
      if (dagar.length) kontrollera(dagar, "dag", `${k.id} dagar`);
    }
  });

  it("avsnitten pekar på indikatorer som finns", () => {
    const ids = new Set(kap.kpier.map((k) => k.id));
    for (const a of kap.avsnitt) for (const id of a.kpi_ids) expect(ids.has(id)).toBe(true);
  });

  it("beskrivande mått saknar status, andra har riktning hog eller lag", () => {
    for (const k of kap.kpier) {
      if (k.riktning === "neutral") expect(k.status).toBeNull();
      else expect(k.status).not.toBeNull();
    }
  });

  it("huvudpunkterna: högst sex, en mening var, svenska tal och inga em dash", () => {
    expect(kap.huvudpunkter.length).toBeGreaterThan(0);
    expect(kap.huvudpunkter.length).toBeLessThanOrEqual(6);
    const kpiIds = new Set(kap.kpier.map((k) => k.id));
    for (const h of kap.huvudpunkter) {
      expect(antalMeningar(h.text), h.text).toBe(1);
      expect(h.text).not.toContain(EM_DASH);
      expect(h.text, "decimalpunkt").not.toMatch(/\d\.\d/);
      if (h.kpi_id) expect(kpiIds.has(h.kpi_id)).toBe(true);
    }
    const namnda = kap.huvudpunkter.map((h) => h.kpi_id).filter(Boolean);
    expect(new Set(namnda).size).toBe(namnda.length);
  });
});

describe("normalisera i detalj", () => {
  it("kolada-n79179: 2023 och 2024 saknas för Halland och seriebrottet 2024 finns som not", () => {
    const k = kpi("ar-skr-tillganglighet.json", "kolada-n79179");
    const ts = k.serier[HALLAND_ID].tidsserie;
    expect(ts.map((p) => p.etikett)).toEqual(["2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"]);
    expect(ts.filter((p) => p.varde === null).map((p) => p.period)).toEqual(["2023-01-01", "2024-01-01"]);
    expect(k.noter).toEqual([expect.objectContaining({ typ: "seriebrott", period: "2024-01-01", begrepp_id: "seriebrott" })]);
    expect(k.serier[HALLAND_ID]).toMatchObject({ senaste: 89.8, rank: 7, rank_av: 19, status: "gul" });
    expect(k.jamforelse).toEqual({ typ: "riket", varde: 88.5, etikett: "Riket 2025", period: "2025-01-01" });
    expect(k.serier[RIKET_ID].senaste).toBe(88.5);
  });

  it("kronor när beskrivningen anger kronor, annars antal", () => {
    expect(kpi("ar-skr-kostnader.json", "kolada-u70020").format).toEqual({ enhet: "kronor", decimaler: 0, etikett: "kr" });
    expect(kpi("ar-skr-kostnader.json", "kolada-u79065").format.enhet).toBe("kronor");
    expect(kpi("ar-skr-kostnader.json", "kolada-n70808").format.enhet).toBe("antal");
    expect(kpi("ar-skr-saker-vard.json", "kolada-u70425").format).toEqual({ enhet: "antal", decimaler: 1, etikett: "" });
    expect(arKronor("Strukturjusterad kostnad, kr/inv")).toBe(true);
    expect(arKronor("Andel besvarade samtal, andel (%)")).toBe(false);
  });

  it("riktning och aggregering", () => {
    const n = kpi("ar-skr-kostnader.json", "kolada-n70808");
    expect(n).toMatchObject({ riktning: "neutral", status: null });
    expect(n.serier[HALLAND_ID].status).toBeUndefined();
    expect(kpi("ar-skr-kostnader.json", "kolada-u70020").riktning).toBe("lag");
    expect(kpi("ar-skr-tillganglighet.json", "kolada-n79179")).toMatchObject({ riktning: "hog", aggregering: "andel" });
    expect(kpi("manad-akutflode.json", "akutbesok").aggregering).toBe("summa");
    expect(kpi("manad-akutflode.json", "belaggning")).toMatchObject({ aggregering: "andel", riktning: "lag" });
    expect(kpi("manad-akutflode.json", "vantetid")).toMatchObject({ aggregering: "medel", format: { enhet: "minuter" } });
  });

  it("undernivåer blir sjukhus under Region Halland med egna serier och förväntat intervall", () => {
    const kap = modell("manad-akutflode.json");
    expect(kap.enheter.filter((e) => e.niva === "sjukhus").map((e) => e.id).sort()).toEqual(["halmstad", "kungsbacka", "nord", "syd", "varberg"]);
    expect(kap.enheter.find((e) => e.id === "halmstad")).toMatchObject({ namn: "Halmstad", parent_id: HALLAND_ID });
    const b = kpi("manad-akutflode.json", "belaggning");
    expect(b.serier.halmstad.tidsserie.at(-1)).toMatchObject({ period: "2026-03-01", etikett: "mar 26", varde: 98.8, yhat: 99.4, lo80: 97.8, hi80: 100.9 });
    expect(b.serier.halmstad.dagar?.length).toBe(31);
    expect(b.jamforelse).toMatchObject({ typ: "foregaende_period", etikett: "mar 2025", period: "2025-03-01" });
  });

  it("periodetiketter följer stilguiden 3.2", () => {
    expect(kpi("kvartal-akutflode.json", "belaggning").serier[HALLAND_ID].tidsserie.at(-1)?.etikett).toBe(`kv.${String.fromCharCode(0xa0)}1 26`);
    expect(kpi("vecka-akutflode.json", "belaggning").serier[HALLAND_ID].tidsserie.at(-1)?.etikett).toBe(`v.${String.fromCharCode(0xa0)}13`);
    expect(kpi("dag-akutflode.json", "belaggning").serier[HALLAND_ID].tidsserie.at(-1)?.etikett).toBe("31 mar");
  });

  it("regionernas plats räknas med lika värden på samma plats; Hallands plats kommer ur datan", () => {
    const k = kpi("ar-skr-kunskapsbaserad.json", "kolada-u79063");
    expect(k.serier[HALLAND_ID].rank).toBe(9);
    expect(k.serier["0006"]).toMatchObject({ senaste: 99.1, rank: 8, rank_av: 21 });
    expect(platser(new Map([["a", 3], ["b", 5], ["c", 5], ["d", null]]), "hog")).toEqual(new Map([["a", 3], ["b", 1], ["c", 1]]));
    expect(platser(new Map([["a", 3], ["b", 5]]), "lag")).toEqual(new Map([["a", 1], ["b", 2]]));
  });
});

describe("hjälpfunktioner", () => {
  it("periodrutnät och luckor", () => {
    expect(periodRutnat(["2020-01-01", "2023-01-01"], "ar")).toEqual(["2020-01-01", "2021-01-01", "2022-01-01", "2023-01-01"]);
    expect(periodRutnat(["2025-11-01", "2026-02-01"], "manad")).toEqual(["2025-11-01", "2025-12-01", "2026-01-01", "2026-02-01"]);
    expect(periodRutnat(["2026-03-23", "2026-03-09"], "vecka")).toEqual(["2026-03-09", "2026-03-16", "2026-03-23"]);
    expect(nastaPeriod("2025-10-01", "kvartal")).toBe("2026-01-01");
    const fylld = fyllLuckor([{ period: "2020-01-01", etikett: "2020", varde: 1 }], ["2020-01-01", "2021-01-01"], "ar");
    expect(fylld[1]).toEqual({ period: "2021-01-01", etikett: "2021", varde: null });
  });

  it("kontrollen hittar trasiga filer", () => {
    expect(valideraKontrakt(null)).not.toEqual([]);
    expect(valideraKontrakt({ id: "x", namn: "x" })).toContain("Sektionen saknar kpier");
    expect(valideraKontrakt({ id: "x", namn: "x", kpier: [{ id: "k", namn: "k", enhet: "procent", tidsserie: [{ period: "2020", varde: "1" }] }] }))
      .toEqual(["k: tidsserie[0] saknar ISO-period"]);
    expect(() => normalisera({ id: "x" }, "ar")).toThrow(/Ogiltig kapitelfil/);
    expect(kontraktVersion({ kontrakt_version: 2 })).toBe(2);
  });
});
