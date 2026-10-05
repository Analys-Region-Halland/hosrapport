// Tester för minidiagrammet (WP3) och WP3:s rättelser i linjediagrammet:
// täta serier och tooltipen under plotytan i smala diagram.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { tema } from "../../design/tema";
import Diagram from "../Diagram";
import { Tooltip } from "../karna/Tooltip";
import { kapitel } from "../karna/testdata";
import { minidiagramSpec } from "../kpiTillSpec";
import { RENDERARE } from "../register";
import { datafiler, provSpec } from "./provdata";

const r = RENDERARE.minidiagram;
const { bredd: B, hojd: H } = tema.diagram.hojd.minidiagram;

const allaMini = () => datafiler().flatMap(({ vy, sektion }) => {
  const kap = kapitel(vy, sektion);
  return kap.kpier.map((kpi) => ({ namn: `${vy}-${sektion} ${kpi.id}`, spec: minidiagramSpec(kpi, kap, { vy }) }));
});

describe("minidiagram", () => {
  it("96 × 24, fokuslinje 1,5 px, slutpunkt r 2,5, egen skala, inga axlar, allt inom rutan", () => {
    let antal = 0;
    for (const { namn, spec } of allaMini()) {
      expect(r.hojd(B, spec)).toBe(H);
      const scen = r.layout(spec, { bredd: B, hojd: H }, tema);
      expect(scen.xTicks).toEqual([]);
      expect(scen.yTicks).toEqual([]);
      const former = scen.lager.flatMap((l) => l.former);
      const linje = former.find((f) => f.typ === "linje");
      expect(linje?.typ === "linje" && [linje.bredd, linje.farg], namn).toEqual([1.5, tema.farg.diagram.fokus]);
      const punkter = former.filter((f) => f.typ === "punkt");
      if (scen.stopp.length) expect(punkter.at(-1)?.typ === "punkt" && punkter.at(-1)!.r, namn).toBe(2.5);
      for (const f of punkter) {
        if (f.typ !== "punkt") continue;
        expect(f.x - f.r, namn).toBeGreaterThanOrEqual(0);
        expect(f.x + f.r, namn).toBeLessThanOrEqual(B);
        expect(f.y - f.r, namn).toBeGreaterThanOrEqual(0);
        expect(f.y + f.r, namn).toBeLessThanOrEqual(H);
      }
      // Egen skala: lägsta värdet längst ned, högsta längst upp
      if (new Set(scen.stopp.map((s) => s.varde)).size > 1) {
        const lagst = scen.stopp.reduce((a, b) => (b.varde < a.varde ? b : a));
        const hogst = scen.stopp.reduce((a, b) => (b.varde > a.varde ? b : a));
        expect(lagst.y, namn).toBeCloseTo(scen.plot.y + scen.plot.h);
        expect(hogst.y, namn).toBeCloseTo(scen.plot.y);
      }
      antal++;
    }
    expect(antal).toBeGreaterThan(80);
  });

  it("fristående i en tabellcell: egen svg med role=img och textsammanfattningen", () => {
    const spec = minidiagramSpec(kapitel("ar", "skr-tillganglighet").kpier.find((k) => k.id === "kolada-n79179")!, kapitel("ar", "skr-tillganglighet"), { vy: "ar" });
    const scen = r.layout(spec, { bredd: B, hojd: H }, tema);
    const Rita = r.Rita;
    const html = renderToStaticMarkup(<Rita scen={scen} spec={spec} aktiv={null} fasta={[]} />);
    expect(html).toMatch(/^<svg[^>]*role="img"/);
    expect(html).toContain(`aria-label="${spec.sammanfattning}"`);
    expect(html).toContain(`width="${B}"`);
    // Inne i Diagram: en svg med role=img, ingen fokus (ingen egen interaktion)
    const iDiagram = renderToStaticMarkup(<Diagram spec={spec} bredd={B} />);
    expect((iDiagram.match(/role="img"/g) ?? []).length).toBe(1);
    expect(iDiagram).not.toContain("tabindex");
    expect(iDiagram).not.toContain("aria-live");
  });
});

describe("rättelser i linjediagrammet", () => {
  it("täta serier (dag och vecka): bara Avvikelse som romb, inga korta etiketter", () => {
    for (const vy of ["dag", "vecka"] as const) {
      const spec = provSpec(vy, "akutflode", "belaggning", "tid");
      const scen = RENDERARE.linje.layout(spec, { bredd: 832, hojd: RENDERARE.linje.hojd(832, spec) }, tema);
      const punkter = scen.lager.find((l) => l.id === "punkter")?.former ?? [];
      const roda = spec.serier.find((s) => s.roll === "fokus")!.punkter!.filter((p) => p.varde !== null && p.signal === "rod").length;
      expect(punkter.filter((f) => f.typ === "markor").length, vy).toBe(roda);
      expect(punkter.every((f) => f.typ === "markor" && f.form === "romb"), vy).toBe(true);
      expect(punkter.some((f) => f.typ === "text"), vy).toBe(false);
    }
    // Månadsdata: trianglar för Bevaka och korta etiketter som förut
    const manad = provSpec("manad", "akutflode", "belaggning", "tid");
    const scen = RENDERARE.linje.layout(manad, { bredd: 832, hojd: RENDERARE.linje.hojd(832, manad) }, tema);
    const former = scen.lager.find((l) => l.id === "punkter")?.former ?? [];
    expect(former.some((f) => f.typ === "markor" && f.form !== "romb")).toBe(true);
  });

  it("tooltipen kan stå under plotytan i full bredd", () => {
    const lage = {
      modell: { rubrik: "2025", nyMetod: false, rader: [], noter: [], uppmaning: null, live: "" },
      x: 100, yta: { x: 40, y: 12, b: 200, h: 180 }, under: 226,
    };
    expect(renderToStaticMarkup(<Tooltip lage={lage} bredd={300} helBredd />)).toContain("data-hel-bredd");
    expect(renderToStaticMarkup(<Tooltip lage={lage} bredd={800} helBredd={false} />)).not.toContain("data-hel-bredd");
  });
});
