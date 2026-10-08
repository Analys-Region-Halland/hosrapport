// export/pptx.test.ts: PowerPoint-exporten (WP12a). Varje graftyp har en
// definierad återgivning, inga färger utanför tema.ts, riket i webbens färg,
// och decket har den bildlista som planen säger.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { kpiTillSpec, minidiagramSpec, visningar } from "../charts/kpiTillSpec";
import type { ChartSpec, DiagramTyp, VisningId } from "../charts/spec";
import { RIKET_ID, type KapitelModell, type KpiModell, type VyId } from "../data/modell";
import { normalisera } from "../data/normalisera";
import { tema } from "../design/tema";
import { ATERGIVNING, PANELER_PER_BILD, grafPlan, minstaHojd, panelsidor, type GrafPlan } from "./graf";
import { delaRader, kortAnalys, meningar, planeraDeck, type LagetRad } from "./innehall";
import { byggPptx } from "./pptx";
import { utanPlatshistorik } from "../charts/typer/provdata";
import { allaFarger, familj, hex } from "./pptxTema";

const DATA = fileURLToPath(new URL("../../public/data/", import.meta.url));
const filer = readdirSync(DATA).filter((f) => f.endsWith(".json") && f !== "index.json").sort();
const vyAv = (fil: string) => fil.split("-")[0] as VyId;
const kapitel = filer.map((f) => ({ fil: f, vy: vyAv(f), kap: normalisera(JSON.parse(readFileSync(DATA + f, "utf8")), vyAv(f)) }));
const arKapitel = kapitel.filter((k) => k.vy === "ar");
const RUTA = { x: 3.9, y: 2, b: 5.6, h: 2.9 };

/** Första indikatorn (årsdata) vars spec i visningen uppfyller villkoret. */
function hitta(visning: VisningId, villkor: (s: ChartSpec) => boolean, fasta: string[] = []): { kap: KapitelModell; kpi: KpiModell; spec: ChartSpec } {
  for (const { kap } of arKapitel) {
    for (const kpi of kap.kpier) {
      if (!visningar(kpi, kap, { vy: "ar" }).some((v) => v.id === visning)) continue;
      const spec = kpiTillSpec(kpi, kap, { vy: "ar", fasta }, visning);
      if (villkor(spec)) return { kap, kpi, spec };
    }
  }
  throw new Error(`ingen indikator med ${visning}`);
}

const serier = (p: GrafPlan) => p.diagram.flatMap((d) => d.serier);

describe("återgivning per graftyp", () => {
  const typer: DiagramTyp[] = ["linje", "rangordning", "stapel", "smaMultiplar", "minidiagram", "bump"];

  it("varje graftyp har en beskriven återgivning", () => {
    for (const t of typer) expect(ATERGIVNING[t], t).toMatch(/\S/);
  });

  it("linje mot regionerna: Halland, riket streckat i referensfärgen, övriga utelämnas och nämns i noten", () => {
    const { spec } = hitta("tid", (s) => s.typ === "linje" && s.serier.some((x) => x.roll === "kontext"));
    const plan = grafPlan(spec, RUTA);
    expect(plan.diagram).toHaveLength(1);
    expect(plan.diagram[0].typ).toBe("linje");
    const s = serier(plan);
    const fokus = s.find((x) => x.namn === "Halland");
    const riket = s.find((x) => x.namn === "Riket");
    expect(fokus?.farg).toBe(hex(tema.farg.diagram.fokus));
    expect(riket?.farg).toBe(hex(tema.farg.diagram.referens));
    expect(riket?.streck).toBe("dash");
    expect(s).toHaveLength(2);
    expect(plan.noter).toContain("Övriga regioner finns i webbrapporten.");
    // Namnen står vid linjeslutet, ingen legend
    expect(plan.texter.map((t) => t.text)).toEqual(expect.arrayContaining(["Halland", "Riket"]));
  });

  it("fästa serier får markeringsfärgerna i ordning", () => {
    const { kpi, kap } = hitta("tid", (s) => s.typ === "linje" && s.serier.some((x) => x.roll === "kontext"));
    const fasta = Object.keys(kpi.serier).filter((id) => id !== kpi.fokus && id !== RIKET_ID).slice(0, 2);
    const plan = grafPlan(kpiTillSpec(kpi, kap, { vy: "ar", fasta }, "tid"), RUTA);
    const farger = serier(plan).map((x) => x.farg);
    expect(farger).toEqual(expect.arrayContaining(tema.farg.diagram.markering.slice(0, 2).map(hex)));
  });

  it("förväntat intervall: två tunna linjer och Halland", () => {
    const { spec } = hitta("tid", (s) => s.typ === "linje" && s.serier.some((x) => x.roll === "forvantat"));
    const s = serier(grafPlan(spec, RUTA));
    expect(s.map((x) => x.namn)).toEqual(expect.arrayContaining(["Förväntat intervall, nedre", "Förväntat intervall, övre"]));
    const kanter = s.filter((x) => x.namn.startsWith("Förväntat"));
    for (const k of kanter) expect(k.bredd).toBeLessThan(s.find((x) => !x.namn.startsWith("Förväntat"))?.bredd ?? 0);
  });

  it("rangordning: liggande stapel bäst överst med Halland i fokusfärgen", () => {
    // Regionernas rangordning ritas när fokus har plats för färre än två perioder (annars bumpdiagram)
    const b = hitta("rang", (s) => s.typ === "bump");
    const spec = kpiTillSpec(utanPlatshistorik(b.kpi), b.kap, { vy: "ar" }, "rang");
    expect(spec.typ).toBe("rangordning");
    expect(spec.serier.some((x) => x.roll === "grans")).toBe(true);
    const plan = grafPlan(spec, RUTA);
    const d = plan.diagram[0];
    expect(d.typ).toBe("liggande");
    const rader = spec.serier.filter((x) => x.roll === "fokus" || x.roll === "kontext" || x.roll === "markerad");
    // PowerPoint ritar första kategorin nederst: planen har sämst först
    expect(d.kategorier).toEqual(rader.map((r) => r.namn).reverse());
    const i = d.kategorier.indexOf("Halland");
    expect(d.stapelFarger?.[i]).toBe(hex(tema.farg.diagram.fokus));
    expect(d.stapelFarger?.filter((f) => f === hex(tema.farg.diagram.fokus))).toHaveLength(1);
    expect(d.varde.min).toBeLessThanOrEqual(0);
    // Riket som lodrät streckad linje, topp 3 som tunn linje
    expect(plan.linjer.some((l) => l.streck === "dash" && l.farg === hex(tema.farg.diagram.referens))).toBe(true);
    expect(plan.linjer.some((l) => l.farg === hex(tema.farg.diagram.grans))).toBe(true);
    expect(plan.texter.map((t) => t.text)).toContain("topp 3");
    // 21 rader behöver mer höjd än standardrutan: bilden väljer den höga layouten
    expect(minstaHojd(spec)).toBeGreaterThan(RUTA.h);
  });

  it("bump: värdena som linjediagram utan topp 3-gräns, med en not om placeringen", () => {
    const { spec } = hitta("rang", (s) => s.typ === "bump");
    const plan = grafPlan(spec, RUTA);
    expect(plan.diagram).toHaveLength(1);
    expect(plan.diagram[0].typ).toBe("linje");
    expect(serier(plan).find((x) => x.namn === "Halland")?.farg).toBe(hex(tema.farg.diagram.fokus));
    expect(plan.linjer.some((l) => l.farg === hex(tema.farg.diagram.grans))).toBe(false);
    expect(plan.noter).toContain("Placeringen bland regionerna år för år finns i webbrapporten.");
  });

  it("stapel över tid: stående staplar från noll", () => {
    const { spec } = hitta("tid", (s) => s.typ === "stapel");
    const d = grafPlan(spec, RUTA).diagram[0];
    expect(d.typ).toBe("stapel");
    expect(d.varde.min).toBe(0);
    expect(d.stapelFarger).toEqual([hex(tema.farg.diagram.fokus)]);
  });

  it("små multiplar: ett diagram per enhet med delad skala, högst sex per bild", () => {
    const { spec } = hitta("enheter", (s) => s.typ === "smaMultiplar" && (s.paneler?.length ?? 0) >= 2);
    const plan = grafPlan(spec, RUTA);
    expect(plan.diagram).toHaveLength(spec.paneler?.length ?? 0);
    const skalor = new Set(plan.diagram.map((d) => `${d.varde.min}–${d.varde.max}`));
    expect(skalor.size).toBe(1);

    // Åtta paneler: två bilder, sex och två
    const fokus = spec.serier.filter((s) => s.roll === "fokus");
    const extra = Array.from({ length: 8 - fokus.length }, (_, i) => ({ ...fokus[0], id: `extra${i}`, enhetId: `extra${i}` }));
    const atta: ChartSpec = {
      ...spec,
      serier: [...spec.serier, ...extra],
      paneler: [...(spec.paneler ?? []), ...extra.map((e) => ({ enhetId: e.enhetId as string, titel: e.id }))],
    };
    expect(panelsidor(atta)).toBe(2);
    expect(grafPlan(atta, RUTA, 0).diagram).toHaveLength(PANELER_PER_BILD);
    expect(grafPlan(atta, RUTA, 1).diagram).toHaveLength(2);
  });

  it("minidiagram: fokuslinjen utan axlar", () => {
    const { kap } = arKapitel[0];
    const d = grafPlan(minidiagramSpec(kap.kpier[0], kap, { vy: "ar" }), RUTA).diagram[0];
    expect(d.typ).toBe("linje");
    expect(d.varde.visa).toBe(false);
    expect(d.kategoriaxel.visa).toBe(false);
  });

  it("alla indikatorer och visningar ger en plan med minst ett diagram", () => {
    for (const { kap, vy } of kapitel) {
      for (const kpi of kap.kpier) {
        for (const v of visningar(kpi, kap, { vy })) {
          const spec = kpiTillSpec(kpi, kap, { vy }, v.id);
          for (let s = 0; s < panelsidor(spec); s++) expect(grafPlan(spec, RUTA, s).diagram.length, `${kpi.id} ${v.id}`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("färger och typsnitt bara ur design/tema.ts", () => {
  it("lintregeln mot hex-färger hittar inget i export/", async () => {
    const eslint = new ESLint({ cwd: fileURLToPath(new URL("../../", import.meta.url)) });
    const resultat = await eslint.lintFiles(["src/export/**/*.ts"]);
    const fel = resultat.flatMap((r) => r.messages.filter((m) => m.ruleId === "no-restricted-syntax").map((m) => `${r.filePath}:${m.line} ${m.message}`));
    expect(fel).toEqual([]);
  }, 60_000);

  it("ingen färg skrivs som hex utan # heller", () => {
    const mapp = fileURLToPath(new URL("./", import.meta.url));
    for (const fil of readdirSync(mapp).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
      const kod = readFileSync(mapp + fil, "utf8");
      expect(kod.match(/["'`][0-9A-Fa-f]{6}["'`]/g) ?? [], fil).toEqual([]);
    }
  });

  it("typsnitten är tema-stackens, med Office-namnet för Source Serif", () => {
    expect(familj(tema.typ.familj.sans)).toBe("IBM Plex Sans");
    expect(familj(tema.typ.familj.serif)).toBe("Source Serif Pro");
  });
});

describe("decket", () => {
  const tillganglighet = arKapitel.find((k) => k.kap.id === "skr-tillganglighet")?.kap ?? arKapitel[0].kap;

  it("ett kapitel: titel, Det viktigaste, Läget i korthet, avsnitt, en bild per indikator och källor", () => {
    const bilder = planeraDeck([tillganglighet], { titel: tillganglighet.namn, vy: "ar", omfang: "kapitel" });
    expect(bilder[0].typ).toBe("titel");
    expect(bilder[1].typ).toBe("viktigast");
    expect(bilder[2].typ).toBe("laget");
    expect(bilder.filter((b) => b.typ === "avsnitt")).toHaveLength(tillganglighet.avsnitt.length);
    expect(bilder.filter((b) => b.typ === "indikator")).toHaveLength(tillganglighet.kpier.length);
    expect(bilder[bilder.length - 1].typ).toBe("kallor");
    expect(new Set(bilder.map((b) => b.id)).size).toBe(bilder.length);
  });

  it("hela rapporten: rapportens tre bilder och sedan varje kapitel", () => {
    const kap = arKapitel.map((k) => k.kap);
    const rapport = planeraDeck(kap, { titel: "Hälso- och sjukvården i Halland", vy: "ar", omfang: "rapport" });
    const perKapitel = kap.reduce((n, k) => n + planeraDeck([k], { titel: k.namn, vy: "ar", omfang: "kapitel" }).length, 0);
    expect(rapport.slice(0, 3).map((b) => b.typ)).toEqual(["titel", "viktigast", "kapitelLista"]);
    expect(rapport).toHaveLength(3 + perKapitel);
  });

  it("filen har planens bilder, riket i referensfärgen och inga andra färger än tema.ts", async () => {
    const { pptx, bilder } = byggPptx([tillganglighet], { titel: tillganglighet.namn, vy: "ar", omfang: "kapitel", publicerad: "2026-03-31" });
    const zip = await JSZip.loadAsync(await pptx.write({ outputType: "nodebuffer" }) as Buffer);
    const namn = Object.keys(zip.files);
    expect(namn.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))).toHaveLength(bilder.length);
    const xml = await Promise.all(namn.filter((n) => /^ppt\/(slides\/slide|charts\/chart)\d+\.xml$/.test(n)).map((n) => zip.file(n)?.async("string") ?? ""));
    const farger = new Set(xml.flatMap((x) => [...x.matchAll(/srgbClr val="([0-9A-Fa-f]{6})"/g)].map((m) => m[1].toUpperCase())));
    const tillatna = allaFarger();
    expect([...farger].filter((f) => !tillatna.has(f))).toEqual([]);
    // Riket: serien heter Riket och har referensfärgen, streckad
    const diagram = xml.filter((x) => x.includes("<c:chartSpace"));
    const riket = diagram.flatMap((x) => [...x.matchAll(/<c:ser>(?:(?!<\/c:ser>).)*?<c:v>Riket<\/c:v>(?:(?!<\/c:ser>).)*?<\/c:ser>/gs)].map((m) => m[0]));
    expect(riket.length).toBeGreaterThan(0);
    for (const s of riket) {
      expect(s).toContain(`<a:srgbClr val="${hex(tema.farg.diagram.referens)}"/>`);
      expect(s).toContain('<a:prstDash val="dash"/>');
    }
    // Inga legender
    for (const x of diagram) expect(x).not.toContain("<c:legend>");
  }, 30_000);
});

describe("texter", () => {
  it("meningar delas inte vid förkortningar", () => {
    expect(meningar("Värdet är 3,4 p.e. högre. Halland ligger t.ex. bättre än riket. Nivån är stabil.")).toHaveLength(3);
  });

  it("analysen på bilden har högst tre meningar och inget em dash", () => {
    for (const { kap } of kapitel) {
      for (const kpi of kap.kpier) {
        const a = kortAnalys(kpi);
        expect(meningar(a).length, kpi.id).toBeLessThanOrEqual(3);
        expect(a).not.toContain(String.fromCharCode(0x2014));
      }
    }
  });

  it("Läget i korthet delas utan att en grupprubrik står sist", () => {
    const rader: LagetRad[] = [];
    for (let g = 0; g < 4; g++) {
      rader.push({ typ: "grupp", namn: `Avsnitt ${g}` });
      for (let i = 0; i < 4; i++) rader.push({ typ: "rad", nummer: `${g}.${i}`, namn: "Kort namn", senaste: "1", plats: "", status: null, mal: "x" });
    }
    const sidor = delaRader(rader, 12);
    expect(sidor.flat()).toHaveLength(rader.length);
    for (const s of sidor) {
      expect(s.length).toBeLessThanOrEqual(12);
      expect(s[s.length - 1].typ).toBe("rad");
    }
  });
});
