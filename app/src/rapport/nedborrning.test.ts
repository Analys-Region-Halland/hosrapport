// Tester för nivåerna i en indikator (WP10): nedborrning region › sjukhus ›
// avdelning och tillbaka via brödsmulan, nivåflikarna, undertryckta värden och
// figurens läge i adressen (e= och v=) åt båda hållen.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { kpiTillSpec, specTextfel, visningar } from "../charts/kpiTillSpec";
import type { ChartSpec, SpecKontext } from "../charts/spec";
import { UNDERTRYCKT_NOT } from "../data/exempelhierarki";
import { HALLAND_ID, type KapitelModell, type KpiModell, type VyId } from "../data/modell";
import { normalisera } from "../data/normalisera";
import { format, parse, type Route } from "../nav/route";
import {
  arFokusbar, brodsmula, bytFokus, forvaltLage, giltigtLage, lageFranAdress, lageTillAdress, type NivaLage,
} from "./nedborrning";

const DATA = fileURLToPath(new URL("../../public/data/", import.meta.url));
const ladda = (vy: VyId): KapitelModell => normalisera(JSON.parse(readFileSync(`${DATA}${vy}-akutflode.json`, "utf8")), vy);
const kap = ladda("manad");
const vy: VyId = "manad";
const kpi = (id: string) => kap.kpier.find((k) => k.id === id) as KpiModell;
const ctx = (l: NivaLage): SpecKontext => ({ vy, ...(l.fokus !== HALLAND_ID ? { fokus: l.fokus } : {}) });
const flikar = (k: KpiModell, l: NivaLage) => visningar(k, kap, ctx(l)).map((v) => v.etikett);
const spec = (k: KpiModell, l: NivaLage) => kpiTillSpec(k, kap, ctx(l), l.visning);

describe("nedborrning i akutflödet (månad)", () => {
  // Första enheten på varje nivå, i den ordning panelerna står
  const forstaPanel = (k: KpiModell, l: NivaLage) => spec(k, { ...l, visning: "enheter" }).paneler?.[0]?.enhetId as string;

  it.each(["belaggning", "akutbesok", "vantetid", "ambulans"])("%s: region › per enhet › klick › per enhet under › brödsmulan tillbaka", (id) => {
    const k = kpi(id);
    const ambulans = id === "ambulans";
    const per = ambulans ? "Per ambulansområde" : "Per sjukhus";
    const under = ambulans ? "Per station" : "Per avdelning";

    // Region Halland (förval) och Per sjukhus
    let l = forvaltLage(k, kap, vy);
    expect(l).toEqual({ fokus: HALLAND_ID, visning: "tid" });
    expect(flikar(k, l).slice(0, 2)).toEqual(["Region Halland", per]);
    expect(brodsmula(k, kap, l.fokus)).toEqual([{ id: HALLAND_ID, namn: "Region Halland" }]);
    l = { ...l, visning: "enheter" };
    // Titeln är indikatornamnet; vad figuren visar står i undertitelns andra mening
    const visar = (x: ChartSpec, ord: string) => {
      expect(x.titel).toBe(k.namn);
      expect(x.undertitel).toContain(`. ${ord}, `);
    };
    visar(spec(k, l), per);
    // Aggregatet är aldrig en panel
    expect(spec(k, l).paneler?.map((p) => p.enhetId)).not.toContain(HALLAND_ID);

    // Klick på Halmstad (eller första ambulansområdet): Per avdelning
    const enhet = ambulans ? forstaPanel(k, l) : "halmstad";
    l = bytFokus(k, kap, vy, l, enhet);
    expect(l).toEqual({ fokus: enhet, visning: "enheter" });
    const namn = kap.enheter.find((e) => e.id === enhet)?.namn;
    expect(flikar(k, l).slice(0, 2)).toEqual([namn, under]);
    expect(brodsmula(k, kap, l.fokus).map((b) => b.namn)).toEqual(["Region Halland", namn]);
    const s = spec(k, l);
    visar(s, under);
    expect(s.borrbar).toBe(true);
    expect(s.paneler?.map((p) => p.enhetId)).not.toContain(enhet);
    expect(s.paneler?.every((p) => kap.enheter.find((e) => e.id === p.enhetId)?.parent_id === enhet)).toBe(true);
    // Överordnad nivå är referens för andels- och medelmått, inte för summamått
    expect(s.serier.find((x) => x.roll === "referens")?.enhetId).toBe(k.aggregering === "summa" ? undefined : enhet);

    // Brödsmulan tillbaka till regionen: Per sjukhus igen
    l = bytFokus(k, kap, vy, l, HALLAND_ID);
    expect(l).toEqual({ fokus: HALLAND_ID, visning: "enheter" });
    visar(spec(k, l), per);
  });

  it("från enheternas rangordning till nästa nivås rangordning, eller per enhet när den saknas", () => {
    const k = kpi("vantetid");
    const rang = { fokus: HALLAND_ID, visning: "enheterRang" as const };
    expect(flikar(k, rang)).toEqual(["Region Halland", "Per sjukhus", "Sjukhusen rangordnade"]);
    expect(bytFokus(k, kap, vy, rang, "halmstad")).toEqual({ fokus: "halmstad", visning: "enheterRang" });
    expect(flikar(k, { fokus: "halmstad", visning: "enheterRang" })).toEqual(["Halmstad", "Per avdelning", "Avdelningarna rangordnade"]);
    // Kungsbacka har två avdelningar: ingen rangordning, men per avdelning
    expect(bytFokus(k, kap, vy, rang, "kungsbacka")).toEqual({ fokus: "kungsbacka", visning: "enheter" });
  });

  it("ned till en avdelning: över tid, jämför med avdelning bland syskonen, tre led i brödsmulan", () => {
    const k = kpi("belaggning");
    const l = bytFokus(k, kap, vy, { fokus: "halmstad", visning: "enheter" }, "halmstad-medicin-3");
    expect(l).toEqual({ fokus: "halmstad-medicin-3", visning: "tid" });
    expect(flikar(k, l)).toEqual(["Över tid"]);
    expect(brodsmula(k, kap, l.fokus).map((b) => b.namn)).toEqual(["Region Halland", "Halmstad", "Medicin 3"]);
    const s = spec(k, l);
    expect(s.jamforNiva).toEqual({ id: "avdelning", etikett: "avdelning" });
    expect(s.jamforbara?.map((j) => j.namn)).toEqual(["Akutvårdsavdelning", "Infektion", "Kirurgi 2"]);
    expect(s.serier.find((x) => x.roll === "referens")?.enhetId).toBe("halmstad");
    // Upp till sjukhuset via brödsmulan: Halmstad över tid, jämför med sjukhus
    const upp = bytFokus(k, kap, vy, l, "halmstad");
    expect(upp).toEqual({ fokus: "halmstad", visning: "tid" });
    expect(spec(k, upp).jamforNiva).toEqual({ id: "sjukhus", etikett: "sjukhus" });
  });

  it("alla visningar på alla nivåer i alla tidsupplösningar klarar textreglerna och har högst fyra flikar", () => {
    for (const v of ["dag", "vecka", "manad", "kvartal", "ar"] as VyId[]) {
      const kv = ladda(v);
      for (const k of kv.kpier) {
        for (const e of [HALLAND_ID, ...kv.enheter.filter((x) => x.parent_id).map((x) => x.id)]) {
          if (!arFokusbar(k, kv, e)) continue;
          const c: SpecKontext = { vy: v, ...(e !== HALLAND_ID ? { fokus: e } : {}) };
          const vis = visningar(k, kv, c);
          expect(vis.length).toBeLessThanOrEqual(3);   // plus dagfliken: högst fyra
          for (const x of vis) expect(specTextfel(kpiTillSpec(k, kv, c, x.id)), `${v} ${k.id} ${e} ${x.id}`).toEqual([]);
        }
      }
    }
  });
});

describe("undertryckta värden på avdelningsnivå", () => {
  const k = kpi("vantetid");
  const l: NivaLage = { fokus: "halmstad", visning: "enheter" };

  it("lucka i grafen, .. i tabellvyn och noten", () => {
    const s = spec(k, l);
    const infektion = s.serier.find((x) => x.enhetId === "halmstad-infektion");
    const undertryckta = infektion?.punkter?.filter((p) => p.undertryckt) ?? [];
    expect(undertryckta.length).toBeGreaterThan(0);
    expect(undertryckta.every((p) => p.varde === null)).toBe(true);
    expect(s.tabell.rader.flat()).toContain("..");
    expect(s.noter).toContainEqual({ typ: "undertryckt", text: UNDERTRYCKT_NOT });
    expect(UNDERTRYCKT_NOT).toBe("Värden baserade på färre än 10 fall visas inte.");
  });

  it("noten finns inte på regionnivå, där inget är undertryckt", () => {
    expect(spec(k, { fokus: HALLAND_ID, visning: "enheter" }).noter.some((n) => n.typ === "undertryckt")).toBe(false);
  });
});

describe("läget i adressen (e= och v=)", () => {
  const k = kpi("vantetid");
  const route = (extra: Partial<Extract<Route, { sida: "kapitel" }>>): Route => ({ sida: "kapitel", id: "akutflode", vy, i: "vantetid", ...extra });

  it("adressen ger läget när den pekar på indikatorn", () => {
    expect(lageFranAdress(route({ v: "enheter", e: "halmstad" }), k, kap, vy)).toEqual({ fokus: "halmstad", visning: "enheter" });
    expect(lageFranAdress(route({ e: "halmstad-infektion" }), k, kap, vy)).toEqual({ fokus: "halmstad-infektion", visning: "tid" });
    expect(lageFranAdress(route({ v: "enheterRang" }), k, kap, vy)).toEqual({ fokus: HALLAND_ID, visning: "enheterRang" });
  });

  it("ogiltigt läge faller tillbaka: okänd enhet till regionen, okänd visning till den första", () => {
    expect(lageFranAdress(route({ v: "enheter", e: "finns-inte" }), k, kap, vy)).toEqual({ fokus: HALLAND_ID, visning: "enheter" });
    expect(lageFranAdress(route({ v: "rang", e: "halmstad" }), k, kap, vy)).toEqual({ fokus: "halmstad", visning: "tid" });
    // En avdelning har inga enheter under sig
    expect(lageFranAdress(route({ v: "enheter", e: "halmstad-infektion" }), k, kap, vy)).toEqual({ fokus: "halmstad-infektion", visning: "tid" });
    // Riket ligger inte under regionen
    expect(giltigtLage(k, kap, vy, { fokus: "0000", visning: "tid" }).fokus).toBe(HALLAND_ID);
  });

  it("adressen till ett annat block, kapitel eller en annan sida ger förval", () => {
    expect(lageFranAdress(route({ i: "belaggning", e: "halmstad" }), k, kap, vy)).toEqual(forvaltLage(k, kap, vy));
    expect(lageFranAdress({ ...route({ e: "halmstad" }), id: "skr-tillganglighet" } as Route, k, kap, vy)).toEqual(forvaltLage(k, kap, vy));
    expect(lageFranAdress({ sida: "start" }, k, kap, vy)).toEqual(forvaltLage(k, kap, vy));
    expect(lageFranAdress(null, k, kap, vy)).toEqual(forvaltLage(k, kap, vy));
  });

  it("läget blir v och e med förval utelämnade", () => {
    expect(lageTillAdress(k, kap, vy, { fokus: HALLAND_ID, visning: "tid" })).toEqual({});
    expect(lageTillAdress(k, kap, vy, { fokus: HALLAND_ID, visning: "enheter" })).toEqual({ v: "enheter" });
    expect(lageTillAdress(k, kap, vy, { fokus: "halmstad", visning: "tid" })).toEqual({ e: "halmstad" });
    expect(lageTillAdress(k, kap, vy, { fokus: "halmstad", visning: "enheter" })).toEqual({ v: "enheter", e: "halmstad" });
  });

  it("åt båda hållen: varje nåbart läge överlever format och parse", () => {
    let antal = 0;
    for (const x of kap.kpier) {
      for (const e of [HALLAND_ID, ...kap.enheter.filter((y) => y.parent_id).map((y) => y.id)]) {
        if (!arFokusbar(x, kap, e)) continue;
        for (const v of visningar(x, kap, { vy, fokus: e === HALLAND_ID ? undefined : e })) {
          const lage: NivaLage = { fokus: e, visning: v.id };
          const hash = format({ sida: "kapitel", id: kap.id, vy, i: x.id, ...lageTillAdress(x, kap, vy, lage) });
          expect(lageFranAdress(parse(hash), x, kap, vy), hash).toEqual(lage);
          antal++;
        }
      }
    }
    expect(antal).toBeGreaterThan(40);
    expect(format({ sida: "kapitel", id: "akutflode", vy, i: "vantetid", ...lageTillAdress(k, kap, vy, { fokus: "halmstad", visning: "enheter" }) }))
      .toBe("#/kapitel/akutflode?vy=manad&i=vantetid&v=enheter&e=halmstad");
  });
});
