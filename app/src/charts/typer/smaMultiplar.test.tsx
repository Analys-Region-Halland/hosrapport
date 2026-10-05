// Tester för små multiplar (WP3): delad skala, ordningen, kolumnreglerna,
// rubrikerna, referensen, synkroniserad hjälplinje, tooltip, nedborrning,
// SSR och att hovring bara ritar överlägget.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { akutflodeUtdrag, hierarki } from "../../data/fixturer";
import { tema } from "../../design/tema";
import Diagram from "../Diagram";
import { panelinteraktion } from "../karna/interaktion";
import { kpiTillSpec, visningar } from "../kpiTillSpec";
import { RENDERARE, type Scen } from "../register";
import type { ChartSpec } from "../spec";
import { allaSpecar } from "./provdata";
import { panelGeometri, panelTooltip } from "./smaMultiplar";

const r = RENDERARE.smaMultiplar;
const TUNG = 30_000;
const layout = (spec: ChartSpec, bredd: number): Scen => r.layout(spec, { bredd, hojd: r.hojd(bredd, spec) }, tema);
const ak = akutflodeUtdrag();
const belaggning = kpiTillSpec(ak.kpier.find((k) => k.id === "belaggning")!, ak, { vy: "manad" }, "enheter");
const h = hierarki();
const ater = h.kpier.find((k) => k.id === "demo-aterinskrivning")!;
const avdelningar = kpiTillSpec(ater, h, { vy: "manad", fokus: "halmstad" }, "enheter");

/** Små multiplar ur datafilerna och hierarkin, alla nivåer. */
const prov: { namn: string; spec: ChartSpec }[] = [
  ...allaSpecar("enheter", "smaMultiplar").map((p) => ({ namn: `${p.fil} ${p.kpi.id}`, spec: p.spec })),
  ...h.kpier.flatMap((kpi) => [undefined, "halmstad", "varberg", "kungsbacka"].flatMap((fokus) =>
    visningar(kpi, h, { vy: "manad", fokus }).some((v) => v.id === "enheter")
      ? [{ namn: `hierarki ${kpi.id} ${fokus ?? "region"}`, spec: kpiTillSpec(kpi, h, { vy: "manad", fokus }, "enheter") }]
      : [])),
];

describe("fixturerna", () => {
  it("täcker sjukhus, avdelningar, index och undertryckta värden", () => {
    expect(prov.length).toBeGreaterThanOrEqual(8);
    expect(prov.some((p) => p.spec.noter.some((n) => n.typ === "skala"))).toBe(true);
    expect(prov.some((p) => p.spec.noter.some((n) => n.typ === "undertryckt"))).toBe(true);
  });
});

describe("layout", () => {
  it("3 kolumner från 760 px, 2 vid 480–759, 1 under 480 (stilguiden 6.5)", () => {
    const kolumner = (bredd: number) => new Set(layout(avdelningar, bredd).paneler!.map((p) => Math.round(p.x))).size;
    expect(kolumner(832)).toBe(3);
    expect(kolumner(760)).toBe(3);
    expect(kolumner(759)).toBe(2);
    expect(kolumner(480)).toBe(2);
    expect(kolumner(479)).toBe(1);
    expect(kolumner(256)).toBe(1);
  });

  for (const bredd of [256, 326, 560, 832]) {
    it(`delad skala, specens ordning och allt inom bredden (${bredd} px)`, () => {
      for (const { namn, spec } of prov) {
        const scen = layout(spec, bredd);
        const paneler = scen.paneler ?? [];
        // Ordningen = specens paneler (bäst först enligt riktningen, se kpiTillSpec)
        expect(paneler.map((p) => p.enhetId), namn).toEqual(spec.paneler?.map((p) => p.enhetId));
        // Delad skala: samma värde ger samma höjd i plotytan i varje panel
        const relativ = paneler.map((p) => p.stopp.map((s) => (p.plot.y + p.plot.h - s.y) / p.plot.h - (s.varde - Number(scen.yTicks[0].v)) / (Number(scen.yTicks.at(-1)!.v) - Number(scen.yTicks[0].v))));
        for (const rel of relativ.flat()) expect(Math.abs(rel), namn).toBeLessThan(1e-6);
        expect(new Set(paneler.map((p) => p.plot.h)).size, namn).toBe(1);
        expect(new Set(paneler.map((p) => Math.round(p.plot.b * 1000))).size, namn).toBe(1);
        for (const p of paneler) {
          expect(p.x + p.b, namn).toBeLessThanOrEqual(bredd + 1e-6);
          expect(p.namn.h, namn).toBeGreaterThanOrEqual(tema.komponent.klickyta);
          for (const s of p.stopp) {
            expect(s.x).toBeGreaterThanOrEqual(p.plot.x - 1e-6);
            expect(s.x).toBeLessThanOrEqual(p.plot.x + p.plot.b + 1e-6);
            expect(s.y).toBeGreaterThanOrEqual(p.plot.y - 1e-6);
            expect(s.y).toBeLessThanOrEqual(p.plot.y + p.plot.h + 1e-6);
          }
        }
        expect(paneler.length, namn).toBeLessThanOrEqual(tema.diagram.smaMultiplar.maxPaneler);
        expect(r.hojd(bredd, spec), namn).toBe(panelGeometri(spec, bredd).hojd);
      }
    }, TUNG);
  }

  it("panelhöjden följer clamp(170, 0,66 × panelbredd, 230) plus rubriken", () => {
    const g = panelGeometri(belaggning, 832);
    expect(g.diagramH).toBe(Math.round(Math.min(230, Math.max(170, 0.66 * g.panelB))));
    expect(g.panelH).toBe(g.rubrikH + tema.rum[2] + g.diagramH);
  });

  it("rubriken: namnet i granssnitt 600, senaste värdet och statusmarkören; två rader när det inte ryms", () => {
    const scen = layout(belaggning, 832);
    const axel = scen.lager.find((l) => l.id === "axel")!.former;
    const kungsbacka = scen.paneler![0];
    expect(kungsbacka.namn.text).toBe("Kungsbacka");
    const texter = axel.filter((f) => f.typ === "text" && f.serieId === kungsbacka.serieId).map((f) => f.typ === "text" && f.text);
    expect(texter).toHaveLength(2);
    expect(texter[1]).toBe("I fas");
    expect(axel.some((f) => f.typ === "rekt" && f.serieId === kungsbacka.serieId && f.radie === tema.komponent.statusmarkor.hojd / 2)).toBe(true);
    expect(panelGeometri(belaggning, 832).rubrikRader).toBe(1);
    expect(panelGeometri(avdelningar, 832).rubrikRader).toBe(2);
  });

  it("referensen ritas i varje panel men etiketteras bara i den första", () => {
    const scen = layout(belaggning, 832);
    const ref = scen.lager.find((l) => l.id === "referens")!.former.filter((f) => f.typ === "linje");
    expect(ref).toHaveLength(3);
    const etiketter = scen.lager.find((l) => l.id === "punkter")!.former.filter((f) => f.typ === "text");
    expect(etiketter.map((f) => f.typ === "text" && f.text)).toEqual(["Region Halland"]);
    const forsta = scen.paneler![0].plot;
    for (const e of etiketter) if (e.typ === "text") expect(e.x).toBeLessThanOrEqual(forsta.x + forsta.b + 1e-6);
  });

  it("tickvärdena står bara till vänster om första kolumnen", () => {
    const scen = layout(avdelningar, 832);
    const tick = scen.lager.find((l) => l.id === "axel")!.former.filter((f) => f.typ === "text" && f.ankare === "end");
    const forsta = scen.paneler![0].plot.x;
    for (const f of tick) if (f.typ === "text") expect(f.x).toBeLessThan(forsta);
    expect(tick.length).toBe(scen.yTicks.length * Math.ceil(scen.paneler!.length / 3));
  });
});

describe("interaktion", () => {
  const scen = layout(belaggning, 832);
  const utan = panelinteraktion(panelTooltip)(scen, belaggning);
  const med = panelinteraktion(panelTooltip)(scen, belaggning, { nedborrning: true });

  it("tooltipen står i panelen under pekaren med enhetens värde och överordnad nivå", () => {
    const varberg = scen.paneler![1];
    const a = utan.pekare(varberg.plot.x + varberg.plot.b / 2, varberg.plot.y + 10, null, false)!;
    expect(a.serieId).toBe(varberg.serieId);
    const t = utan.tooltip(a, "mus")!;
    expect(t.yta).toEqual(varberg.plot);
    expect(t.under).toBe(varberg.y + varberg.h);
    expect(t.modell.rader.map((r) => r.namn).sort()).toEqual(["Region Halland", "Varberg"]);
    expect(t.modell.rader.find((r) => r.fet)?.namn).toBe("Varberg");
    expect(t.modell.uppmaning).toBeNull();
    expect(med.tooltip(a, "mus")!.modell.uppmaning).toBe("Klicka på namnet för att visa Varberg");
    expect(med.tooltip(a, "tangent")!.modell.uppmaning).toBe("Tryck Enter för att visa Varberg");
  });

  it("Enter borrar ned i panelen när figuren kan", () => {
    const a = { index: 3, serieId: scen.paneler![2].serieId };
    expect(med.tangent("Enter", a).fokus).toBe(scen.paneler![2].enhetId);
    expect(utan.tangent("Enter", a).fokus).toBeUndefined();
  });

  it("synkroniserad hjälplinje: en i varje panel, statiska lagret oförändrat", () => {
    const Rita = r.Rita;
    const statiskt = (html: string) => html.slice(html.indexOf('<g data-lager="statisk"'), html.indexOf('<g data-lager="overlagg"'));
    const vila = statiskt(renderToStaticMarkup(<svg><Rita scen={scen} spec={belaggning} aktiv={null} fasta={[]} /></svg>));
    let antal = 0;
    for (const p of scen.paneler!) {
      for (let px = p.plot.x; px <= p.plot.x + p.plot.b; px += 17) {
        const aktiv = utan.pekare(px, p.plot.y + p.plot.h / 2, null, false);
        const html = renderToStaticMarkup(<svg><Rita scen={scen} spec={belaggning} aktiv={aktiv} fasta={[]} /></svg>);
        expect(statiskt(html)).toBe(vila);
        if (!aktiv) continue;
        antal++;
        expect((html.match(/data-hjalplinje/g) ?? []).length).toBe(scen.paneler!.length);
        const x = [...html.matchAll(/<line x1="([\d.]+)"[^>]*data-hjalplinje/g)].map((m) => Number(m[1]) );
        const dx = x.map((v, i) => v - scen.paneler![i].plot.x);
        expect(Math.max(...dx) - Math.min(...dx)).toBeLessThan(1);
      }
    }
    expect(antal).toBeGreaterThan(20);
  });
});

describe("SSR", () => {
  it("renderar alla fixturer utan fel, med och utan nedborrning", () => {
    for (const { namn, spec } of prov) {
      for (const bredd of [326, 832]) {
        const html = renderToStaticMarkup(<Diagram spec={spec} bredd={bredd} onFokus={() => undefined} />);
        expect(html, namn).toContain('role="img"');
        expect(html).toContain("data-panelnamn");
        expect(html).toContain("data-nedborrning");
        expect(html).not.toContain("NaN");
      }
      expect(renderToStaticMarkup(<Diagram spec={spec} bredd={832} />)).not.toContain("data-nedborrning");
    }
  }, TUNG);
});
