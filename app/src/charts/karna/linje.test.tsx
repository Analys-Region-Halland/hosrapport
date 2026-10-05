// Tester för linjediagrammet (G2 i docs/arkitektur.md WP2): layout för alla
// fixturer, luckor, etikettkolumn, ticks, SSR och att hovring bara ritar
// överlägget.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { akutflodeUtdrag, hierarki, skrUtdrag } from "../../data/fixturer";
import { tema } from "../../design/tema";
import Diagram from "../Diagram";
import { kpiTillSpec, visningar } from "../kpiTillSpec";
import { RENDERARE, type AktivPunkt, type Scen } from "../register";
import type { ChartSpec } from "../spec";
import { tillampaFasta, vaxlaFast } from "./fasta";
import { byggTraffmodell, pekarlage, startlage, tangent } from "./interaktion";
import { tidsaxel } from "./skalor";
import { allaLinjer, fixtur } from "./testdata";
import { byggPunktIndex, tooltipModell } from "./tooltipModell";

const linje = RENDERARE.linje;
const BREDDER = [326, 560, 832];
const layout = (spec: ChartSpec, bredd: number): Scen =>
  linje.layout(spec, { bredd, hojd: linje.hojd(bredd, spec) }, tema);

const fixturer = allaLinjer();
const telefon = fixtur("ar", "skr-tillganglighet", "kolada-n79179");

describe("fixturerna", () => {
  it("täcker linjediagrammen i datafilerna (kpiTillSpec, visning tid)", () => {
    expect(new Set(fixturer.map((f) => f.fil)).size).toBeGreaterThanOrEqual(8);
    expect(fixturer.length).toBeGreaterThan(60);
    expect(fixturer.some((f) => f.spec.serier.some((s) => s.roll === "forvantat"))).toBe(true);
  });
});

describe("layout för alla fixturer", () => {
  for (const bredd of BREDDER) {
    it(`inget utanför plotytan och ticks omsluter datan (${bredd} px)`, () => {
      for (const f of fixturer) {
        const scen = layout(f.spec, bredd);
        const { plot } = scen;
        const e = 1e-6;
        for (const s of scen.stopp) {
          expect(s.x, f.kpiId).toBeGreaterThanOrEqual(plot.x - e);
          expect(s.x, f.kpiId).toBeLessThanOrEqual(plot.x + plot.b + e);
          expect(s.y, f.kpiId).toBeGreaterThanOrEqual(plot.y - e);
          expect(s.y, f.kpiId).toBeLessThanOrEqual(plot.y + plot.h + e);
        }
        for (const l of scen.lager) for (const form of l.former) {
          if (form.typ === "punkt" || form.typ === "markor") {
            expect(form.x).toBeGreaterThanOrEqual(plot.x - e);
            expect(form.x).toBeLessThanOrEqual(plot.x + plot.b + e);
            expect(form.y).toBeGreaterThanOrEqual(plot.y - e);
            expect(form.y).toBeLessThanOrEqual(plot.y + plot.h + e);
          }
        }
        // Ticks omsluter: översta gridlinjen på eller över högsta värdet, understa på eller under lägsta
        const varden = scen.stopp.map((s) => s.varde);
        if (varden.length) {
          const t = scen.yTicks.map((x) => x.v);
          expect(Math.min(...t), f.kpiId).toBeLessThanOrEqual(Math.min(...varden));
          expect(Math.max(...t), f.kpiId).toBeGreaterThanOrEqual(Math.max(...varden));
        }
        // Plotytan och etiketterna ryms i bredden
        expect(plot.x + plot.b).toBeLessThanOrEqual(bredd);
        expect(bredd - plot.x - plot.b).toBeLessThanOrEqual(bredd * tema.diagram.etikett.maxMarginalAndel + 1e-6);
      }
    });

    it(`etiketterna står i en kolumn utan överlapp (${bredd} px)`, () => {
      for (const f of fixturer) {
        const scen = layout(f.spec, bredd);
        const x = new Set(scen.etiketter.map((e) => e.x));
        expect(x.size, f.kpiId).toBeLessThanOrEqual(1);
        // Minst 17 px mellan raderna; en etikett på två rader tar två radhöjder
        const rad = tema.diagram.etikett.minAvstand;
        const e = scen.etiketter.slice().sort((a, b) => a.y - b.y);
        for (let i = 1; i < e.length; i++) {
          const krav = ((e[i].rader.length + e[i - 1].rader.length) * rad) / 2;
          expect(e[i].y - e[i - 1].y, f.kpiId).toBeGreaterThanOrEqual(krav - 1e-6);
        }
        for (const e of scen.etiketter) {
          expect(e.x + e.textbredd, f.kpiId).toBeLessThanOrEqual(bredd + 1);
          expect(e.y).toBeGreaterThanOrEqual(scen.plot.y);
          expect(e.y).toBeLessThanOrEqual(scen.plot.y + scen.plot.h);
        }
      }
    });
  }
});

describe("luckor och seriebrott (kolada-n79179)", () => {
  const scen = layout(telefon, 832);
  const fokusLinje = scen.lager.find((l) => l.id === "fokus")!.former.find((f) => f.typ === "linje");

  it("luckor bryter linjen", () => {
    // Halland har 2016–2022 och 2025: två delbanor
    expect(fokusLinje?.typ === "linje" && fokusLinje.d.match(/M/g)?.length).toBe(2);
    const stopp = scen.stopp.filter((s) => s.serieId === "0013").map((s) => s.index);
    expect(stopp).toEqual([0, 1, 2, 3, 4, 5, 6, 9]);
  });

  it("slutpunkt r 4,5 för Halland och inga punkter för kontextlinjer", () => {
    const fokus = scen.lager.find((l) => l.id === "fokus")!.former.filter((f) => f.typ === "punkt");
    expect(fokus.map((f) => f.typ === "punkt" && f.r)).toEqual([tema.diagram.roll.fokus.punktradie]);
    expect(scen.lager.find((l) => l.id === "kontext")!.former.every((f) => f.typ === "linje")).toBe(true);
  });

  it("seriebrottet märks på tidsaxeln med ny metod", () => {
    const axel = scen.lager.find((l) => l.id === "axel")!.former;
    expect(axel.some((f) => f.typ === "streck")).toBe(true);
    expect(axel.some((f) => f.typ === "text" && f.text === "ny metod")).toBe(true);
    const smal = layout(telefon, 326).lager.find((l) => l.id === "axel")!.former;
    expect(smal.some((f) => f.typ === "text")).toBe(false);
  });

  it("x-axeln har 2016, 2020 och 2025", () => {
    expect(scen.xTicks.map((t) => t.text)).toEqual(["2016", "2020", "2025"]);
  });

  it("etiketter för Halland, riket, högsta och lägsta region", () => {
    expect(scen.etiketter.map((e) => e.helText).sort()).toEqual(["Halland", "Kalmar", "Riket", "Västerbotten"].sort());
  });
});

describe("perioder utan mätning (enkät vartannat år)", () => {
  it("bryter inte linjerna; luckor bryter bara när andra serier har värde", () => {
    const scen = layout(fixtur("ar", "skr-syn-pa-varden", "kolada-n79171"), 832);
    const fokus = scen.lager.find((l) => l.id === "fokus")!.former.find((f) => f.typ === "linje");
    expect(fokus?.typ === "linje" && fokus.d.match(/M/g)?.length).toBe(1);
    const kontext = scen.lager.find((l) => l.id === "kontext")!.former;
    expect(kontext.every((f) => f.typ === "linje" && f.d.includes("L"))).toBe(true);
    expect(scen.xTicks.map((t) => t.text)).toEqual(["2016", "2020", "2024"]);
  });
});

describe("mållinje", () => {
  it("ritas som en streckad linje med etiketten Mål {värde}", () => {
    const spec: ChartSpec = { ...telefon, serier: [...telefon.serier, { id: "mal", namn: "Mål", roll: "mal", varde: 90 }], etiketter: [...telefon.etiketter, { serieId: "mal", text: "" }] };
    const scen = layout(spec, 832);
    const mal = scen.lager.find((l) => l.id === "mal")!.former[0];
    expect(mal.typ === "streck" && mal.streck).toBe(tema.diagram.roll.mal.streck);
    expect(scen.etiketter.find((e) => e.serieId === "mal")?.text).toBe("Mål 90,0 %");
  });
});

describe("fästa serier", () => {
  it("två fästa regioner blir markerade i fästordning med etikett", () => {
    const spec = fixtur("ar", "skr-tillganglighet", "kolada-n79179", ["0012", "0001"]);
    const skane = spec.serier.find((s) => s.id === "0012")!;
    const sthlm = spec.serier.find((s) => s.id === "0001")!;
    expect([skane.roll, skane.markeringIndex, sthlm.roll, sthlm.markeringIndex]).toEqual(["markerad", 0, "markerad", 1]);
    const scen = layout(spec, 832);
    expect(scen.etiketter.some((e) => e.serieId === "0012" && e.farg === tema.farg.diagram.markering[0])).toBe(true);
    // Specen är redan byggd med samma fästa: tillampaFasta ändrar inget
    expect(tillampaFasta(spec, ["0012", "0001"])).toBe(spec);
    // Utan fästa i specen ger tillampaFasta samma roller som kpiTillSpec
    const lokal = tillampaFasta(telefon, ["0012", "0001"]);
    expect(lokal.serier.find((s) => s.id === "0012")!.markeringIndex).toBe(0);
    expect(lokal.etiketter.some((e) => e.serieId === "0001")).toBe(true);
  });
  it("kopplingslinjen börjar vid linjeslutet även när serien slutar före sista perioden", () => {
    const scen = layout(fixtur("ar", "skr-tillganglighet", "kolada-n79179", ["0001"]), 832);
    const sthlm = scen.etiketter.find((e) => e.serieId === "0001")!;
    const sista = scen.stopp.filter((s) => s.serieId === "0001").at(-1)!;
    expect(sthlm.ankarX).toBeCloseTo(sista.x + 6);
    expect(sthlm.ankarY).toBeCloseTo(sista.y);
    expect(sthlm.x).toBeCloseTo(scen.plot.x + scen.plot.b + tema.diagram.etikett.kolumnAvstand);
  });
  it("högst fyra; den femte ersätter den äldsta", () => {
    expect(vaxlaFast(["a", "b", "c", "d"], "e")).toEqual(["b", "c", "d", "e"]);
    expect(vaxlaFast(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("tooltip", () => {
  const axel = tidsaxel(telefon);
  const pi = byggPunktIndex(telefon, axel);
  it("visar Halland, riket och lyft region med plats, sorterade efter värde", () => {
    const m = tooltipModell(tillampaFasta(telefon, []), axel, pi, { index: 9, serieId: "0006" });
    expect(m.rubrik).toBe("2025");
    expect(m.nyMetod).toBe(true);
    expect(m.rader.map((r) => r.namn)).toEqual(["Jönköpings län", "Halland", "Riket"]);
    expect(m.rader.find((r) => r.namn === "Halland")!.plats).toBe("plats 7 av 19");
    expect(m.rader.find((r) => r.fet)!.namn).toBe("Jönköpings län");
    expect(m.uppmaning).toBe("Klicka för att visa Jönköpings län i grafen");
  });
  it("säger när Halland saknar värde", () => {
    const m = tooltipModell(telefon, axel, pi, { index: 7, serieId: null });
    expect(m.noter).toEqual(["Inget värde för Halland 2023"]);
  });
  it("fäst region: Klicka för att ta bort", () => {
    const spec = fixtur("ar", "skr-tillganglighet", "kolada-n79179", ["0006"]);
    const m = tooltipModell(spec, tidsaxel(spec), byggPunktIndex(spec, tidsaxel(spec)), { index: 9, serieId: "0006" });
    expect(m.uppmaning).toBe("Klicka för att ta bort");
  });
  it("förväntat intervall: värde, förväntat, intervall och status i ord", () => {
    const spec = fixtur("manad", "akutflode", "belaggning");
    const ax = tidsaxel(spec);
    const i = ax.perioder.indexOf("2025-12-01");
    const m = tooltipModell(spec, ax, byggPunktIndex(spec, ax), { index: i, serieId: null });
    expect(m.rubrik).toBe("dec 2025");
    expect(m.rader.map((r) => r.namn)).toEqual(["Halland", "Förväntat värde", "Förväntat intervall (80 %)", "Status"]);
    expect(m.rader[3].varde).toBe("Bevaka");
  });
});

describe("tangentbord", () => {
  const spec = fixtur("ar", "skr-tillganglighet", "kolada-n79179", ["0012"]);
  const scen = layout(spec, 832);
  const m = byggTraffmodell(scen, spec);
  it("startar på Hallands senaste värde och flyttar med pilar, Home och End", () => {
    let a: AktivPunkt | null = startlage(m, spec);
    expect(a).toEqual({ index: 9, serieId: "0013" });
    a = tangent("ArrowLeft", m, spec, a).aktiv;
    expect(a?.index).toBe(8);
    a = tangent("Home", m, spec, a).aktiv;
    expect(a?.index).toBe(0);
    a = tangent("End", m, spec, a).aktiv;
    expect(a?.index).toBe(9);
  });
  it("↑ ↓ växlar Halland, riket, fästa, sedan övriga efter värde", () => {
    let a: AktivPunkt | null = { index: 9, serieId: "0013" };
    const ordning: (string | null)[] = [];
    for (let i = 0; i < 4; i++) { a = tangent("ArrowDown", m, spec, a).aktiv; ordning.push(a?.serieId ?? null); }
    expect(ordning).toEqual(["0000", "0012", "0008", "0019"]);
    a = tangent("ArrowUp", m, spec, { index: 9, serieId: "0013" }).aktiv;
    expect(a?.serieId).not.toBe("0013");
  });
  it("Enter fäster en region, Escape stänger", () => {
    const u = tangent("Enter", m, spec, { index: 9, serieId: "0006" });
    expect(u.vaxla).toBe("0006");
    expect(tangent("Enter", m, spec, { index: 9, serieId: "0013" }).vaxla).toBeUndefined();
    expect(tangent("Escape", m, spec, { index: 9, serieId: null })).toEqual({ hanterad: true, aktiv: null });
  });
});

describe("SSR", () => {
  it("renderar alla fixturer utan fel", () => {
    for (const f of fixturer) {
      for (const bredd of [326, 832]) {
        const html = renderToStaticMarkup(<Diagram spec={f.spec} bredd={bredd} fasta={["0012", "0001"]} />);
        expect(html, f.kpiId).toContain('role="img"');
        expect(html).toContain('data-lager="statisk"');
        expect(html).not.toContain("NaN");
      }
    }
  });

  it("renderar WP1:s fixturer i alla visningar (linje här, övriga typer som stubbar)", () => {
    let linjer = 0;
    const fall = [{ kap: skrUtdrag(), vy: "ar" as const }, { kap: akutflodeUtdrag(), vy: "manad" as const }, { kap: hierarki(), vy: "manad" as const }];
    for (const { kap, vy } of fall) {
      for (const kpi of kap.kpier) {
        const ctx = { vy };
        for (const v of visningar(kpi, kap, ctx)) {
          const spec = kpiTillSpec(kpi, kap, ctx, v.id);
          if (spec.typ === "linje") linjer++;
          const html = renderToStaticMarkup(<Diagram spec={spec} bredd={640} />);
          expect(html, `${kpi.id}:${v.id}`).toContain('role="img"');
          expect(html).not.toContain("NaN");
        }
      }
    }
    expect(linjer).toBeGreaterThan(3);
  });
});

describe("hovring ritar bara överlägget", () => {
  it("statiska lagret är oförändrat under en pekarsekvens", () => {
    const spec = fixtur("ar", "skr-tillganglighet", "kolada-n79179", ["0012"]);
    const scen = layout(spec, 832);
    const m = byggTraffmodell(scen, spec);
    const Rita = linje.Rita;
    const statiskt = (html: string) => {
      const start = html.indexOf('<g data-lager="statisk"');
      const slut = html.indexOf('<g data-lager="overlagg"');
      return html.slice(start, slut);
    };
    const paths = (html: string) => (html.match(/<path/g) ?? []).length;
    const vila = statiskt(renderToStaticMarkup(<svg><Rita scen={scen} spec={spec} aktiv={null} fasta={["0012"]} /></svg>));
    expect(paths(vila)).toBeGreaterThan(20);

    // Simulerad pekarsekvens: svep över plotytan och längs en linje
    let aktiv: AktivPunkt | null = null;
    const sekvens: [number, number][] = [];
    for (let px = scen.plot.x; px <= scen.plot.x + scen.plot.b; px += 23) sekvens.push([px, scen.plot.y + scen.plot.h / 2]);
    for (const s of scen.stopp.filter((x) => x.serieId === "0006")) sekvens.push([s.x + 1, s.y + 2]);
    let lyfta = 0;
    for (const [px, py] of sekvens) {
      aktiv = pekarlage(m, px, py, aktiv);
      if (aktiv?.serieId) lyfta++;
      const html = renderToStaticMarkup(<svg><Rita scen={scen} spec={spec} aktiv={aktiv} fasta={["0012"]} /></svg>);
      expect(paths(statiskt(html))).toBe(paths(vila));
      expect(statiskt(html)).toBe(vila);
    }
    expect(lyfta).toBeGreaterThan(5);
  });
});
