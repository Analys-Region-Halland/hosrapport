// Tester för stapel över tid (WP3): staplar på noll, stapelbredd = 2 ×
// mellanrum, högst 24 staplar, tooltipen med förändringar, SSR och att
// hovring bara ritar överlägget.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { akutflodeUtdrag, hierarki } from "../../data/fixturer";
import { HART, MINUS } from "../../design/format";
import { tema } from "../../design/tema";
import Diagram from "../Diagram";
import { tidsinteraktion } from "../karna/interaktion";
import { tidsaxel } from "../karna/skalor";
import { kpiTillSpec } from "../kpiTillSpec";
import { RENDERARE, type Scen } from "../register";
import type { ChartSpec } from "../spec";
import { allaSpecar, provSpec } from "./provdata";
import { sammaPeriodAretInnan, stapelGeometri, stapelTooltip } from "./stapel";

const r = RENDERARE.stapel;
const layout = (spec: ChartSpec, bredd: number): Scen => r.layout(spec, { bredd, hojd: r.hojd(bredd, spec) }, tema);
const ak = akutflodeUtdrag();
const besok = kpiTillSpec(ak.kpier.find((k) => k.id === "akutbesok")!, ak, { vy: "manad" }, "tid");
const h = hierarki();
const utskrivna = kpiTillSpec(h.kpier.find((k) => k.id === "demo-utskrivningar")!, h, { vy: "manad" }, "tid");
const prov = [
  ...allaSpecar("tid", "stapel").map((p) => ({ namn: `${p.fil} ${p.kpi.id}`, spec: p.spec })),
  { namn: "utdrag akutbesok", spec: besok },
  { namn: "hierarki utskrivningar", spec: utskrivna },
];
const staplar = (scen: Scen) => scen.lager.find((l) => l.id === "fokus")?.former.filter((f) => f.typ === "rekt") ?? [];

describe("fixturerna", () => {
  it("summamått med högst 24 perioder ritas som staplar", () => {
    expect(prov.length).toBeGreaterThanOrEqual(6);
    for (const p of prov) expect(p.spec.typ, p.namn).toBe("stapel");
  });
});

describe("layout", () => {
  for (const bredd of [256, 326, 560, 832]) {
    it(`staplarna står på noll, högst 24, inom plotytan (${bredd} px)`, () => {
      for (const { namn, spec } of prov) {
        const scen = layout(spec, bredd);
        const y0 = scen.yTicks.find((t) => t.v === 0)?.y;
        expect(y0, namn).toBeDefined();
        const s = staplar(scen);
        expect(s.length, namn).toBeGreaterThan(0);
        expect(s.length, namn).toBeLessThanOrEqual(24);
        for (const f of s) {
          if (f.typ !== "rekt") continue;
          expect(f.y + f.h, namn).toBeCloseTo(y0 as number, 6);         // nedre kanten på noll
          expect(f.x, namn).toBeGreaterThanOrEqual(scen.plot.x - 1e-6);
          expect(f.x + f.b, namn).toBeLessThanOrEqual(scen.plot.x + scen.plot.b + 1e-6);
          expect(f.y, namn).toBeGreaterThanOrEqual(scen.plot.y - 1e-6);
        }
        // Noll ingår alltid i värdeaxeln och nollinjen ritas
        expect(scen.yTicks[0].v, namn).toBe(0);
        const noll = scen.lager.find((l) => l.id === "punkter")?.former[0];
        expect(noll?.typ === "streck" && noll.farg, namn).toBe(tema.farg.diagram.nollinje);
        expect(scen.plot.x + scen.plot.b, namn).toBeLessThanOrEqual(bredd);
      }
    });
  }

  it("stapelbredd = 2 × mellanrum", () => {
    const g = stapelGeometri(24, { x: 40, b: 720 }, tema);
    expect(g.bredd / g.mellanrum).toBeCloseTo(tema.diagram.stapel.breddPerMellanrum);
    expect(g.steg).toBe(30);
    expect(g.mitt(0)).toBe(55);
    const scen = layout(besok, 832);
    const [a, b] = staplar(scen);
    if (a.typ === "rekt" && b.typ === "rekt") expect(a.b / (b.x - (a.x + a.b))).toBeCloseTo(2);
  });

  it("vågrätt streckat rutnät på tickvärdena och tidsaxeln med samma etikettregler som linjen", () => {
    const scen = layout(besok, 832);
    expect(scen.yTicks.length).toBeGreaterThanOrEqual(4);
    expect(scen.xTicks.map((t) => t.text)).toEqual(["apr 24", "jan 25", "jan 26", "mar 26"].filter((t) => scen.xTicks.some((x) => x.text === t)));
    expect(scen.xTicks.some((t) => t.text === "jan 25")).toBe(true);
  });
});

describe("tooltip", () => {
  const axel = tidsaxel(besok);
  const scen = layout(besok, 832);
  const m = tidsinteraktion(stapelTooltip)(scen, besok);

  it("samma period året innan för månad, kvartal och vecka; inget för år", () => {
    expect(sammaPeriodAretInnan(axel, axel.perioder.indexOf("2026-03-01"))).toBe(axel.perioder.indexOf("2025-03-01"));
    expect(sammaPeriodAretInnan(axel, 0)).toBeNull();
    const kv = provSpec("kvartal", "akutflode", "akutbesok", "tid");
    const kvAxel = tidsaxel(kv);
    expect(kvAxel.perioder[sammaPeriodAretInnan(kvAxel, kvAxel.perioder.length - 1) as number]).toBe("2025-01-01");
    const ar = provSpec("ar", "akutflode", "akutbesok", "tid");
    expect(sammaPeriodAretInnan(tidsaxel(ar), 3)).toBeNull();
  });

  it("perioden, värdet, förändringen mot föregående period och mot samma period året innan", () => {
    const i = axel.perioder.indexOf("2026-03-01");
    const t = m.tooltip({ index: i, serieId: null }, "mus")!;
    expect(t.modell.rubrik).toBe("mar 2026");
    expect(t.modell.rader.map((r) => r.namn)).toEqual(["Halland", "Mot feb 2026", "Mot mar 2025"]);
    expect(t.modell.rader[0].fet).toBe(true);
    for (const r of t.modell.rader.slice(1)) {
      expect(r.varde).toMatch(new RegExp(`^(\\+|${MINUS})?[\\d${HART}]+$`));
      expect(r.plats).toMatch(new RegExp(`^(\\+|${MINUS})?\\d+,\\d${HART}%$`));
    }
    expect(t.modell.uppmaning).toBeNull();
    // Första perioden har ingen föregående
    expect(m.tooltip({ index: 0, serieId: null }, "mus")!.modell.rader).toHaveLength(1);
  });

  it("årsdata: förändringen mot föregående år visas en gång", () => {
    const ar = provSpec("ar", "akutflode", "akutbesok", "tid");
    const s = layout(ar, 832);
    const t = tidsinteraktion(stapelTooltip)(s, ar).tooltip({ index: 3, serieId: null }, "mus")!;
    expect(t.modell.rader.map((r) => r.namn)).toEqual(["Halland", "Mot 2023"]);
  });
});

describe("ritning", () => {
  it("SSR utan fel", () => {
    for (const { namn, spec } of prov) {
      for (const bredd of [326, 832]) {
        const html = renderToStaticMarkup(<Diagram spec={spec} bredd={bredd} />);
        expect(html, namn).toContain('role="img"');
        expect(html).not.toContain("NaN");
      }
    }
  });

  it("hovring mörkar stapeln i överlägget; statiska lagret oförändrat", () => {
    const scen = layout(besok, 832);
    const m = tidsinteraktion(stapelTooltip)(scen, besok);
    const Rita = r.Rita;
    const statiskt = (html: string) => html.slice(html.indexOf('<g data-lager="statisk"'), html.indexOf('<g data-lager="overlagg"'));
    const vila = statiskt(renderToStaticMarkup(<svg><Rita scen={scen} spec={besok} aktiv={null} fasta={[]} /></svg>));
    let mork = 0;
    for (let px = scen.plot.x; px <= scen.plot.x + scen.plot.b; px += 13) {
      const aktiv = m.pekare(px, scen.plot.y + scen.plot.h / 2, null, false);
      const html = renderToStaticMarkup(<svg><Rita scen={scen} spec={besok} aktiv={aktiv} fasta={[]} /></svg>);
      expect(statiskt(html)).toBe(vila);
      if (aktiv) {
        expect(html).toContain(`data-morkad="${aktiv.index}"`);
        mork++;
      }
    }
    expect(mork).toBeGreaterThan(20);
  });
});
