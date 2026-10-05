// Tester för den påhittade nivån under sjukhusen i akutflödet (WP10):
// deterministisk, summerar och medelvärdesbildar rätt mot föräldern,
// undertrycker under tröskeln och påverkar bara akutflödet.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BARNMALLAR, UNDERTRYCK_UNDER, UNDERTRYCKT_NOT, barnId, delaUpp } from "./exempelhierarki";
import type { KapitelModell, VyId } from "./modell";
import { normalisera } from "./normalisera";

const DATA = fileURLToPath(new URL("../../public/data/", import.meta.url));
const filer = readdirSync(DATA).filter((f) => f.endsWith(".json") && f !== "index.json").sort();
const akutfiler = filer.filter((f) => f.endsWith("-akutflode.json"));
const vyAv = (fil: string) => fil.split("-")[0] as VyId;
const ra = (fil: string): unknown => JSON.parse(readFileSync(DATA + fil, "utf8"));
const cache = new Map<string, KapitelModell>();
const modell = (fil: string) => {
  let k = cache.get(fil);
  if (!k) { k = normalisera(ra(fil), vyAv(fil)); cache.set(fil, k); }
  return k;
};

describe("påhittad nivå under sjukhusen", () => {
  it("finns bara i akutflödet, i alla tidsupplösningar", () => {
    expect(akutfiler).toHaveLength(5);
    for (const fil of filer) {
      const kap = modell(fil);
      const avd = kap.enheter.filter((e) => e.niva === "avdelning" || e.niva === "ambulansstation");
      if (fil.endsWith("-akutflode.json")) expect(avd.length, fil).toBe(14);
      else expect(avd, fil).toEqual([]);
    }
  });

  it("2–4 enheter per sjukhus och ambulansområde, med föräldern som parent_id", () => {
    const kap = modell("manad-akutflode.json");
    const per = (id: string) => kap.enheter.filter((e) => e.parent_id === id);
    for (const id of ["halmstad", "varberg", "kungsbacka"]) {
      expect(per(id).length).toBeGreaterThanOrEqual(2);
      expect(per(id).length).toBeLessThanOrEqual(4);
      expect(per(id).every((e) => e.niva === "avdelning")).toBe(true);
    }
    expect(per("halmstad").map((e) => e.namn)).toEqual(["Akutvårdsavdelning", "Medicin 3", "Kirurgi 2", "Infektion"]);
    expect(per("halmstad")[1].id).toBe("halmstad-medicin-3");
    // Ambulansområdena är inga sjukhus; under dem ligger stationer
    expect(kap.enheter.filter((e) => e.niva === "sjukhus").map((e) => e.id).sort()).toEqual(["halmstad", "kungsbacka", "varberg"]);
    expect(kap.enheter.filter((e) => e.niva === "ambulansomrade").map((e) => e.id).sort()).toEqual(["nord", "syd"]);
    expect(per("nord").every((e) => e.niva === "ambulansstation")).toBe(true);
    // Barnen står direkt efter sin förälder
    const ids = kap.enheter.map((e) => e.id);
    expect(ids.indexOf("halmstad-akutvardsavdelning")).toBe(ids.indexOf("halmstad") + 1);
  });

  it("är deterministisk: samma fil ger samma modell, varje gång", () => {
    for (const fil of akutfiler) {
      expect(normalisera(ra(fil), vyAv(fil)), fil).toEqual(normalisera(ra(fil), vyAv(fil)));
    }
    const kpi = { id: "vantetid", aggregering: "medel" as const, format: { enhet: "minuter" as const, decimaler: 0, etikett: "min" } };
    const p = { period: "2026-03-01", varde: 187 };
    expect(delaUpp(kpi, "halmstad", p, "manad")).toEqual(delaUpp(kpi, "halmstad", p, "manad"));
    // Olika perioder ger olika värden
    expect(delaUpp(kpi, "halmstad", p, "manad")).not.toEqual(delaUpp(kpi, "halmstad", { ...p, period: "2026-02-01" }, "manad"));
  });

  it("summamått summerar exakt och medel- och andelsmått medelvärdesbildas rätt mot föräldern", () => {
    let antal = 0;
    for (const fil of akutfiler) {
      const vy = vyAv(fil);
      for (const kpi of modell(fil).kpier) {
        const halv = 0.5 * 10 ** -kpi.format.decimaler + 1e-9;
        for (const foralder of Object.keys(BARNMALLAR)) {
          const serie = kpi.serier[foralder];
          if (!serie) continue;
          for (const p of serie.tidsserie) {
            const delar = delaUpp(kpi, foralder, p, vy);
            expect(delar.map((d) => d.id)).toEqual(BARNMALLAR[foralder].barn.map(([n]) => barnId(foralder, n)));
            if (p.varde === null) {
              expect(delar.every((d) => d.varde === null)).toBe(true);
              continue;
            }
            const varden = delar.map((d) => d.varde as number);
            if (kpi.aggregering === "summa") {
              expect(varden.reduce((s, v) => s + v, 0), `${fil} ${kpi.id} ${foralder} ${p.period}`).toBeCloseTo(p.varde, 6);
              expect(delar.every((d) => d.n === d.varde)).toBe(true);
            } else {
              const N = delar.reduce((s, d) => s + d.n, 0);
              const medel = delar.reduce((s, d) => s + (d.varde as number) * d.n, 0) / N;
              expect(Math.abs(medel - p.varde), `${fil} ${kpi.id} ${foralder} ${p.period}`).toBeLessThanOrEqual(halv);
            }
            expect(varden.every((v) => v >= 0)).toBe(true);
            antal++;
          }
        }
      }
    }
    expect(antal).toBeGreaterThan(5000);
  });

  it("undertrycker värden under tio fall: inget värde, inget n, undertryckt och not", () => {
    const fil = "manad-akutflode.json";
    const kap = modell(fil);
    const vantetid = kap.kpier.find((k) => k.id === "vantetid");
    if (!vantetid) throw new Error("saknar vantetid");
    let undertryckta = 0, visade = 0;
    for (const p of vantetid.serier.halmstad.tidsserie) {
      const del = delaUpp(vantetid, "halmstad", p, "manad").find((d) => d.id === "halmstad-infektion");
      const q = vantetid.serier["halmstad-infektion"].tidsserie.find((x) => x.period === p.period);
      if (!del || !q || del.varde === null) continue;
      if (del.n < UNDERTRYCK_UNDER) {
        expect(q).toEqual({ period: p.period, etikett: p.etikett, varde: null, undertryckt: true });
        undertryckta++;
      } else {
        expect(q).toMatchObject({ varde: del.varde, n: del.n });
        expect(q.undertryckt).toBeUndefined();
        visade++;
      }
    }
    expect(undertryckta).toBeGreaterThan(0);
    expect(visade).toBeGreaterThan(0);
    expect(vantetid.noter).toContainEqual({ typ: "undertryckt", text: UNDERTRYCKT_NOT });
    expect(UNDERTRYCKT_NOT).toBe("Värden baserade på färre än 10 fall visas inte.");
    // Varje visat värde på avdelningsnivå bygger på minst tio fall
    for (const kpi of kap.kpier) {
      for (const e of kap.enheter.filter((x) => x.niva === "avdelning" || x.niva === "ambulansstation")) {
        for (const q of kpi.serier[e.id]?.tidsserie ?? []) {
          if (q.varde !== null) expect(q.n ?? 0).toBeGreaterThanOrEqual(UNDERTRYCK_UNDER);
        }
      }
    }
  });

  it("barnens serier ligger på förälderns periodrutnät och senaste är sista värdet", () => {
    const kap = modell("manad-akutflode.json");
    for (const kpi of kap.kpier) {
      for (const e of kap.enheter.filter((x) => x.parent_id && BARNMALLAR[x.parent_id])) {
        const s = kpi.serier[e.id];
        const foralder = kpi.serier[e.parent_id as string];
        if (!foralder) { expect(s).toBeUndefined(); continue; }
        expect(s.tidsserie.map((p) => p.period)).toEqual(foralder.tidsserie.map((p) => p.period));
        expect(s.senaste).toBe([...s.tidsserie].reverse().find((p) => p.varde !== null)?.varde ?? null);
      }
    }
  });
});
