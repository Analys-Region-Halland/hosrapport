// Tester för rangordningen (WP3): layout på riktiga fixturer, ordningen och
// platserna ur specen, lika värden, topp 3, riket, smala diagram, SSR,
// tooltip och att hovring bara ritar överlägget.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { skrUtdrag } from "../../data/fixturer";
import { HART } from "../../design/format";
import { tema } from "../../design/tema";
import Diagram from "../Diagram";
import { radinteraktion } from "../karna/interaktion";
import { kpiTillSpec } from "../kpiTillSpec";
import { RENDERARE, type Scen } from "../register";
import type { ChartSpec } from "../spec";
import { allaSpecar, provSpec, utanPlatshistorik } from "./provdata";
import { radTooltip, rangRader } from "./rangordning";

const r = RENDERARE.rangordning;
const TUNG = 30_000;
const layout = (spec: ChartSpec, bredd: number): Scen => r.layout(spec, { bredd, hojd: r.hojd(bredd, spec) }, tema);
// Regionernas rangordning ritas när fokus har plats för färre än två perioder;
// annars blir visningen rang ett bumpdiagram (2026-10-08). Fixturerna behåller
// därför bara fokus senaste värde.
const prov = allaSpecar("rang", "rangordning", [], utanPlatshistorik);
const enheter = allaSpecar("enheterRang", "rangordning");
const telefon = provSpec("ar", "skr-tillganglighet", "kolada-n79179", "rang", ["0012", "0024"], utanPlatshistorik);

describe("fixturerna", () => {
  it("täcker rangordningen för alla SKR-indikatorer med regioner och enheterna i akutflödet", () => {
    expect(prov.length).toBeGreaterThan(60);
    expect(prov.every((p) => p.fil.includes("-skr-"))).toBe(true);
    expect(enheter.length).toBeGreaterThan(3);
  });
  it("med plats för flera perioder blir visningen rang ett bumpdiagram", () => {
    expect(provSpec("ar", "skr-tillganglighet", "kolada-n79179", "rang").typ).toBe("bump");
    expect(allaSpecar("rang", "bump").length).toBeGreaterThan(60);
  });
});

describe("ordningen och platserna", () => {
  it("raderna står i specens ordning och platserna följer `plats` (= rank för Halland)", () => {
    for (const { kpi, spec } of prov) {
      const scen = layout(spec, 832);
      const rader = rangRader(spec);
      expect(scen.stopp.map((s) => s.serieId), kpi.id).toEqual(rader.map((s) => s.id));
      // Raderna uppifrån, jämnt fördelade
      for (let i = 1; i < scen.stopp.length; i++) expect(scen.stopp[i].y - scen.stopp[i - 1].y).toBeCloseTo(tema.diagram.hojd.rangordning.rad);
      // Halland på sin plats ur datan
      const fokus = kpi.serier[kpi.fokus];
      if (fokus.rank !== undefined) {
        const i = scen.stopp.findIndex((s) => s.serieId === kpi.fokus);
        expect(rader[i].plats, kpi.id).toBe(fokus.rank);
        expect(spec.platsAv?.[0], kpi.id).toBe(fokus.rank_av);
      }
      // Bäst till sämst: punkterna går åt rätt håll
      const x = scen.stopp.map((s) => s.x);
      for (let i = 1; i < x.length; i++) {
        if (kpi.riktning === "lag") expect(x[i], kpi.id).toBeGreaterThanOrEqual(x[i - 1] - 1e-6);
        else expect(x[i], kpi.id).toBeLessThanOrEqual(x[i - 1] + 1e-6);
      }
    }
  }, TUNG);

  // Lika värden får samma plats. Undantaget är Halland, vars plats följer rank
  // i datan (R rangordnar på oavrundade värden, se kpiTillSpec).
  it("lika värden får samma plats och ligger intill varandra", () => {
    const kap = skrUtdrag();
    const kpi = kap.kpier.find((k) => k.id === "kolada-u79063")!;
    const spec = kpiTillSpec(utanPlatshistorik(kpi), kap, { vy: "ar" }, "rang");
    const rader = rangRader(spec);
    let lika = 0;
    for (let i = 1; i < rader.length; i++) {
      if (rader[i].varde === rader[i - 1].varde && rader[i].roll !== "fokus" && rader[i - 1].roll !== "fokus") {
        lika++;
        expect(rader[i].plats).toBe(rader[i - 1].plats);
      }
    }
    expect(lika).toBeGreaterThan(0);
    const scen = layout(spec, 832);
    const halland = scen.stopp.find((s) => s.serieId === "0013")!;
    expect(rader[halland.index].plats).toBe(kpi.serier["0013"].rank);
  });
});

describe("layout", () => {
  for (const bredd of [256, 326, 560, 832]) {
    it(`allt ryms i ${bredd} px: namn, punkter, värden och topp 3`, () => {
      for (const { kpi, spec } of [...prov, ...enheter]) {
        const scen = layout(spec, bredd);
        const { plot } = scen;
        expect(plot.x + plot.b, kpi.id).toBeLessThanOrEqual(bredd);
        expect(plot.x, kpi.id).toBeLessThanOrEqual(bredd * tema.diagram.rangordning.namnMaxAndel + tema.rum[3] + 1);
        for (const s of scen.stopp) {
          expect(s.x).toBeGreaterThanOrEqual(plot.x - 1e-6);
          expect(s.x).toBeLessThanOrEqual(plot.x + plot.b + 1e-6);
          expect(s.y).toBeGreaterThan(plot.y);
          expect(s.y).toBeLessThan(plot.y + plot.h);
        }
        const rad = bredd < 560 ? tema.diagram.hojd.rangordning.radMobil : tema.diagram.hojd.rangordning.rad;
        expect(plot.h, kpi.id).toBeCloseTo(rangRader(spec).length * rad);
        // Ticks på jämna värden som omsluter punkterna, lodrätt rutnät
        const v = scen.stopp.map((s) => s.varde);
        expect(scen.xTicks.length, kpi.id).toBeGreaterThanOrEqual(1);
        expect(scen.yTicks).toEqual([]);
        for (const tk of scen.xTicks) expect(tk.x).toBeLessThanOrEqual(plot.x + plot.b + 1e-6);
        expect(Math.min(...v)).toBeGreaterThanOrEqual(Number(scen.xTicks[0].v) - 1e-6);
      }
    }, TUNG);
  }

  it("topp 3 är en linje under tredje raden med texten vid högerkanten (12 px), inte för neutrala mått", () => {
    for (const { kpi, spec } of prov) {
      const scen = layout(spec, 832);
      const axel = scen.lager.find((l) => l.id === "axel")?.former ?? [];
      const grans = spec.serier.find((s) => s.roll === "grans");
      if (kpi.riktning === "neutral") { expect(grans, kpi.id).toBeUndefined(); continue; }
      if (!grans) continue;
      const linje = axel.find((f) => f.typ === "streck");
      const text = axel.find((f) => f.typ === "text");
      expect(linje?.typ === "streck" && linje.y1, kpi.id).toBeCloseTo(Math.round(scen.plot.y + 24 * (grans.varde as number)) + 0.5);
      expect(text?.typ === "text" && [text.text, text.storlek, text.ankare]).toEqual(["topp 3", tema.typ.minsta, "end"]);
    }
  });

  it("riket är en lodrät streckad linje vid sitt värde med etikett och värde ovanför", () => {
    const scen = layout(telefon, 832);
    const ref = scen.lager.find((l) => l.id === "referens")!.former;
    const linje = ref.find((f) => f.typ === "streck");
    const text = ref.find((f) => f.typ === "text");
    expect(linje?.typ === "streck" && linje.streck).toBe(tema.diagram.roll.referens.streck);
    expect(linje?.typ === "streck" && linje.x1).toBe(linje?.typ === "streck" && linje.x2);
    expect(text?.typ === "text" && text.text).toBe(`Riket 88,5${HART}%`);
    expect(text?.typ === "text" && text.y).toBeLessThan(scen.plot.y);
  });

  it("fokus r 5,5 med namn och värde i 600, fästa i sina färger med värde, övriga r 4,5 utan värde", () => {
    const scen = layout(telefon, 832);
    const former = scen.lager.find((l) => l.id === "punkter")!.former;
    const av = (id: string) => former.filter((f) => "serieId" in f && f.serieId === id);
    const halland = av("0013");
    expect(halland.find((f) => f.typ === "punkt")).toMatchObject({ r: 5.5, farg: tema.farg.diagram.fokus });
    expect(halland.filter((f) => f.typ === "text").map((f) => f.typ === "text" && [f.text, f.vikt])).toEqual([["Halland", 600], [`89,8${HART}%`, 600]]);
    const skane = av("0012");
    expect(skane.find((f) => f.typ === "punkt")).toMatchObject({ r: 4.5, farg: tema.farg.diagram.markering[0] });
    expect(skane.filter((f) => f.typ === "text")).toHaveLength(2);
    const kalmar = av("0008");
    expect(kalmar.find((f) => f.typ === "punkt")).toMatchObject({ r: 4.5, farg: tema.farg.diagram.kontextPunkt });
    expect(kalmar.filter((f) => f.typ === "text").map((f) => f.typ === "text" && f.vikt)).toEqual([400]);
    // Inga ytor
    expect(scen.lager.flatMap((l) => l.former).some((f) => f.typ === "yta" || f.typ === "rekt")).toBe(false);
  });

  it("höjden: 24 px per rad, 22 i smala diagram, plus axel och riket", () => {
    const n = rangRader(telefon).length;
    expect(r.hojd(832, telefon)).toBe(tema.rum[5] + n * 24 + 34);
    expect(r.hojd(326, telefon)).toBe(tema.rum[5] + n * 22 + 34);
  });
});

describe("tooltip och interaktion", () => {
  const scen = layout(telefon, 832);
  const m = radinteraktion(radTooltip)(scen, telefon);

  it("raden under pekaren: namn, värde, plats av antal och skillnad mot riket", () => {
    const dalarna = scen.stopp.find((s) => s.serieId === "0020")!;
    const a = m.pekare(5, dalarna.y + 3, null, false);
    expect(a).toEqual({ index: dalarna.index, serieId: "0020" });
    const t = m.tooltip(a!, "mus")!;
    expect(t.y).toBe(dalarna.y);
    expect(t.modell.rubrik).toBe("2025");
    expect(t.modell.rader.map((x) => [x.namn, x.varde, x.plats])).toEqual([
      ["Dalarna", `88,2${HART}%`, `plats${HART}10 av${HART}19`],
      ["Riket", `88,5${HART}%`, null],
      ["Skillnad mot riket", `−0,3${HART}p.e.`, null],
    ]);
    expect(t.modell.uppmaning).toBe("Klicka för att markera Dalarna");
    expect(m.tooltip({ index: 1, serieId: "0012" }, "tangent")!.modell.uppmaning).toBe("Tryck Enter för att ta bort");
    expect(m.tooltip({ index: scen.stopp.find((s) => s.serieId === "0013")!.index, serieId: "0013" }, "mus")!.modell.uppmaning).toBeNull();
  });

  it("Tab startar på Halland", () => {
    expect(m.start()).toEqual({ index: scen.stopp.find((s) => s.serieId === "0013")!.index, serieId: "0013" });
  });

  it("regionernas rader borrar aldrig ned, även när figuren kan", () => {
    const med = radinteraktion(radTooltip)(scen, telefon, { nedborrning: true });
    const dalarna = scen.stopp.find((s) => s.serieId === "0020")!;
    const a = { index: dalarna.index, serieId: "0020" };
    expect(telefon.borrbar).toBeUndefined();
    expect(med.borra?.(a)).toBeNull();
    expect(med.tangent("Enter", a)).toMatchObject({ vaxla: "0020" });
    expect(med.tangent("Enter", a).fokus).toBeUndefined();
  });
});

describe("nedborrning i enheternas rangordning (WP10)", () => {
  const sjukhus = provSpec("manad", "akutflode", "vantetid", "enheterRang");
  const scen = layout(sjukhus, 832);
  const utan = radinteraktion(radTooltip)(scen, sjukhus);
  const med = radinteraktion(radTooltip)(scen, sjukhus, { nedborrning: true });
  const rad = scen.stopp.find((s) => s.serieId === "halmstad")!;
  const a = { index: rad.index, serieId: "halmstad" };

  it("specen säger att raderna kan bli fokus", () => {
    expect(sjukhus.borrbar).toBe(true);
    expect(scen.stopp.map((s) => s.serieId).sort()).toEqual(["halmstad", "kungsbacka", "varberg"]);
  });

  it("klick och Enter på en rad borrar ned när figuren kan, annars fäster de", () => {
    expect(med.borra?.(a)).toBe("halmstad");
    expect(med.tangent("Enter", a)).toMatchObject({ hanterad: true, fokus: "halmstad" });
    expect(med.tangent("Enter", a).vaxla).toBeUndefined();
    expect(utan.borra?.(a)).toBeNull();
    expect(utan.tangent("Enter", a)).toMatchObject({ vaxla: "halmstad" });
  });

  it("uppmaningen säger att raden visar enheten", () => {
    expect(med.tooltip(a, "mus")!.modell.uppmaning).toBe("Klicka för att visa Halmstad");
    expect(med.tooltip(a, "tangent")!.modell.uppmaning).toBe("Tryck Enter för att visa Halmstad");
    expect(med.tooltip(a, "peka")!.modell.uppmaning).toBe("Tryck igen för att visa Halmstad");
    expect(utan.tooltip(a, "mus")!.modell.uppmaning).toBe("Klicka för att markera Halmstad");
  });
});

describe("ritning", () => {
  it("SSR utan fel för alla fixturer och bredder", () => {
    for (const { kpi, spec } of [...prov, ...enheter]) {
      for (const bredd of [326, 832]) {
        const html = renderToStaticMarkup(<Diagram spec={spec} bredd={bredd} fasta={["0012"]} />);
        expect(html, kpi.id).toContain('role="img"');
        expect(html).toContain('data-lager="statisk"');
        expect(html).not.toContain("NaN");
      }
    }
  }, TUNG);

  it("hovring ritar bara överlägget: statiska lagret oförändrat under en pekarsekvens", () => {
    const scen = layout(telefon, 832);
    const Rita = r.Rita;
    const m = radinteraktion(radTooltip)(scen, telefon);
    const statiskt = (html: string) => html.slice(html.indexOf('<g data-lager="statisk"'), html.indexOf('<g data-lager="overlagg"'));
    const vila = statiskt(renderToStaticMarkup(<svg><Rita scen={scen} spec={telefon} aktiv={null} fasta={[]} /></svg>));
    expect((vila.match(/<circle/g) ?? []).length).toBe(rangRader(telefon).length);
    let lyfta = 0;
    for (let py = scen.plot.y - 5; py <= scen.plot.y + scen.plot.h + 5; py += 7) {
      const aktiv = m.pekare(scen.plot.x + 40, py, null, false);
      if (aktiv) lyfta++;
      const html = renderToStaticMarkup(<svg><Rita scen={scen} spec={telefon} aktiv={aktiv} fasta={[]} /></svg>);
      expect(statiskt(html)).toBe(vila);
      if (aktiv) expect(html).toContain("data-hjalplinje");
    }
    expect(lyfta).toBeGreaterThan(40);
  });
});
