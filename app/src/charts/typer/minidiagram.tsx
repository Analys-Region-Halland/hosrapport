// charts/typer/minidiagram.tsx: renderare för diagramtypen "minidiagram"
// (stilguiden 5.8, 6.5 och 6.6). Ägare: WP3.
//
// Utvecklingen i en tabellcell, 96 × 24 px: fokuslinjen 1,5 px och slutpunkten
// r 2,5 i diagram.fokus, egen skala per rad, inga axlar, ingen etikett, aldrig
// fristående. Luckor bryter linjen; ett ensamt värde mellan luckor blir en
// liten punkt. Specen (minidiagramSpec) har bara perioder som mättes, så att
// en enkät vartannat år blir en sammanhängande linje.
//
// Ingen egen interaktion (stilguiden 6.8): raden i tabellen är länk till
// indikatorn. Rita ritar en egen <svg> med role="img" och textsammanfattningen
// när den står fristående i en tabellcell, och bara linjen inne i Diagram.

import { line } from "d3";
import { tema, type Tema } from "../../design/tema";
import { linjarSkala, tidsskala } from "../karna/skalor";
import type { Form, Renderare, Scen, Stopp } from "../register";
import type { ChartSpec } from "../spec";
import { RitaMinidiagram } from "./minidiagramRita";

type Punkt = [number, number | null];

function layout(spec: ChartSpec, storlek: { bredd: number; hojd: number }, t: Tema): Scen {
  const { bredd, hojd } = storlek;
  const m = t.diagram.minidiagram;
  const fokus = spec.serier.find((s) => s.roll === "fokus") ?? spec.serier[0];
  const punkter: Punkt[] = (fokus?.punkter ?? []).map((p, i) => [i, p.varde !== null && Number.isFinite(p.varde) ? p.varde : null]);
  const n = punkter.length;
  // Luft så att slutpunkten och linjens bredd inte klipps av svg:ns kant
  const luft = m.punktradie + m.bredd / 2;
  const plot = { x: luft, y: luft, b: Math.max(1, bredd - 2 * luft), h: Math.max(1, hojd - 2 * luft) };

  const varden = punkter.map((d) => d[1]).filter((v): v is number => v !== null);
  let lo = varden.length ? Math.min(...varden) : 0;
  let hi = varden.length ? Math.max(...varden) : 1;
  if (lo === hi) { lo -= 1; hi += 1; }
  const xs = tidsskala(n, plot.x, plot.x + plot.b);
  const ys = linjarSkala([lo, hi], plot.y + plot.h, plot.y);
  const x = (i: number) => xs(i);
  const y = (v: number) => ys(v);

  const former: Form[] = [];
  const stopp: Stopp[] = [];
  if (fokus) {
    const gen = line<Punkt>().defined((d) => d[1] !== null).x((d) => x(d[0])).y((d) => y(d[1] as number));
    (gen as unknown as { digits?: (n: number) => unknown }).digits?.(1);
    former.push({ typ: "linje", serieId: fokus.id, d: gen(punkter) ?? "", farg: t.diagram.roll.fokus.farg, bredd: m.bredd, streck: null });
    const sista = [...punkter].reverse().find((d) => d[1] !== null);
    punkter.forEach(([i, v], j) => {
      if (v === null) return;
      stopp.push({ serieId: fokus.id, index: i, x: x(i), y: y(v), varde: v });
      const ensam = (j === 0 || punkter[j - 1][1] === null) && (j === n - 1 || punkter[j + 1][1] === null);
      if (ensam && sista && i !== sista[0]) former.push({ typ: "punkt", serieId: fokus.id, x: x(i), y: y(v), r: m.bredd, farg: t.diagram.roll.fokus.farg });
    });
    if (sista) former.push({ typ: "punkt", serieId: fokus.id, x: x(sista[0]), y: y(sista[1] as number), r: m.punktradie, farg: t.diagram.roll.fokus.farg });
  }

  return {
    bredd, hojd, plot,
    xTicks: [], yTicks: [],
    lager: [{ id: "fokus", serieIds: fokus ? [fokus.id] : [], former }],
    etiketter: [],
    stopp,
  };
}

export const minidiagram: Renderare = {
  typ: "minidiagram",
  minstaBredd: tema.diagram.hojd.minidiagram.bredd,
  hojd: () => tema.diagram.hojd.minidiagram.hojd,
  layout,
  Rita: RitaMinidiagram,
};
