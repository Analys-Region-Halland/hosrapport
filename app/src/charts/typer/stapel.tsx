// charts/typer/stapel.tsx: renderare för diagramtypen "stapel", stapel över tid
// (stilguiden 6.3, 6.6 och 6.8). Ägare: WP3.
//
// Volymer (antal, kronor) per period, högst 24 staplar (kpiTillSpec väljer
// linje vid fler). Staplarna står på en nollbaslinje (1 px diagram.nollinje)
// och är diagram.fokus; stapelbredd = 2 × mellanrum (tema.diagram.stapel).
// Vågrätt streckat rutnät och tickvärden till vänster som i linjediagrammet,
// tidsaxeln med samma etikettregler. Saknade perioder får ingen stapel.
//
// Interaktion (karna/interaktion.ts, tid): perioden under pekaren. Stapeln
// mörkas och en hjälplinje går från plotytans överkant ned till stapeln;
// tooltipen visar perioden, värdet, förändringen mot föregående period och mot
// samma period året innan (inte för årsdata, där de är samma sak).
// Tangentbord: ← → mellan staplar, Home/End, Escape.

import { isoVecka, period, varde } from "../../design/format";
import { standardHojd, type Tema } from "../../design/tema";
import { GEOMETRI } from "../karna/geometri";
import { tidsinteraktion } from "../karna/interaktion";
import { textbredd } from "../karna/matt";
import { skarp } from "../karna/ritstil";
import { linjarSkala, tickText, tidsaxel, tidsTicks, vardeTicks, type Tidsaxel } from "../karna/skalor";
import { liveText, relativText, skillnadText } from "../karna/tooltipDelar";
import { serieFarg, vardeVid, type Inmatning, type PunktIndex, type TooltipModell, type TooltipRad } from "../karna/tooltipModell";
import type { AktivPunkt, Form, Lager, Renderare, Scen, Stopp } from "../register";
import type { ChartSpec } from "../spec";
import { RitaStapel } from "./stapelRita";

/** Stapelns x-geometri: periodsteget, stapelbredden och stapelns mitt. */
export function stapelGeometri(antal: number, plot: { x: number; b: number }, t: Tema) {
  const steg = plot.b / Math.max(1, antal);
  const k = t.diagram.stapel.breddPerMellanrum;
  const bredd = (steg * k) / (k + 1);
  return { steg, bredd, mellanrum: steg - bredd, mitt: (i: number) => plot.x + steg * (i + 0.5) };
}

function layout(spec: ChartSpec, storlek: { bredd: number; hojd: number }, t: Tema): Scen {
  const { bredd, hojd } = storlek;
  const axel = tidsaxel(spec);
  const n = axel.perioder.length;
  const smal = bredd < GEOMETRI.smal;
  const format = spec.y.format;
  const fokus = spec.serier.find((s) => s.roll === "fokus");

  // Värdena på periodrutnätet
  const varden: (number | null)[] = Array.from({ length: n }, () => null);
  fokus?.punkter?.forEach((p) => {
    const i = axel.index.get(p.period.slice(0, 10));
    if (i !== undefined && p.varde !== null && Number.isFinite(p.varde)) varden[i] = p.varde;
  });
  const finns = varden.filter((v): v is number => v !== null);

  // Staplar börjar alltid på noll (stilguiden 6.3)
  const vt = vardeTicks(Math.min(0, ...finns), Math.max(0, ...finns), smal, true);
  const tickTexter = vt.ticks.map((v) => tickText(v, format, vt.decimaler));
  const vanster = Math.ceil(Math.max(0, ...tickTexter.map((x) => textbredd(x))) + GEOMETRI.yKolumnLuft);
  const sistaText = n ? period(axel.perioder[n - 1], axel.vy, "axel") : "";
  const hoger = Math.max(GEOMETRI.hogerMin, Math.ceil(textbredd(sistaText) / 2) + GEOMETRI.hogerMin / 2);
  const plot = {
    x: vanster,
    y: GEOMETRI.marginalTopp,
    b: Math.max(1, bredd - vanster - hoger),
    h: Math.max(1, hojd - GEOMETRI.marginalTopp - GEOMETRI.axelrad),
  };
  const g = stapelGeometri(n, plot, t);
  const ys = linjarSkala([vt.ticks[0], vt.ticks[vt.ticks.length - 1]], plot.y + plot.h, plot.y);
  const y0 = ys(0);

  const staplar: Form[] = [];
  const stopp: Stopp[] = [];
  varden.forEach((v, i) => {
    if (v === null || !fokus) return;
    const y = ys(v);
    staplar.push({
      typ: "rekt", serieId: fokus.id, index: i,
      x: g.mitt(i) - g.bredd / 2, y: Math.min(y, y0), b: g.bredd, h: Math.abs(y - y0), farg: t.diagram.roll.fokus.farg,
    });
    stopp.push({ serieId: fokus.id, index: i, x: g.mitt(i), y, varde: v });
  });
  const lager: Lager[] = [
    { id: "fokus", serieIds: fokus ? [fokus.id] : [], former: staplar },
    // Nollbaslinjen ritas ovanpå staplarnas underkant
    {
      id: "punkter", serieIds: [], former: [{
        typ: "streck", x1: plot.x, y1: skarp(y0), x2: plot.x + plot.b, y2: skarp(y0),
        farg: t.farg.diagram.nollinje, bredd: t.diagram.nollinje, streck: null,
      }],
    },
  ];

  return {
    bredd, hojd, plot,
    xTicks: tidsTicks(axel, g.mitt).map((tk) => ({ v: axel.perioder[tk.index], x: tk.x, text: tk.text })),
    yTicks: vt.ticks.map((v, i) => ({ v, y: ys(v), text: tickTexter[i] })),
    lager,
    etiketter: [],
    stopp,
  };
}

// ── Tooltip ──

/** Samma period året innan i tidsaxeln (månad, kvartal, vecka, dag). Årsdata: null. */
export function sammaPeriodAretInnan(axel: Tidsaxel, i: number): number | null {
  const iso = axel.perioder[i];
  if (!iso || axel.vy === "ar") return null;
  if (axel.vy === "vecka") {
    const v = isoVecka(iso);
    const j = axel.perioder.findIndex((p) => {
      const w = isoVecka(p);
      return w.vecka === v.vecka && w.ar === v.ar - 1;
    });
    return j < 0 ? null : j;
  }
  const fore = `${Number(iso.slice(0, 4)) - 1}${iso.slice(4, 10)}`;
  return axel.index.get(fore) ?? null;
}

/**
 * Tooltipen för en stapel (stilguiden 6.8): perioden, värdet och förändringen
 * mot föregående period och mot samma period året innan, med tecken och
 * relativ förändring i procent.
 */
export function stapelTooltip(spec: ChartSpec, axel: Tidsaxel, pi: PunktIndex, aktiv: AktivPunkt, _satt: Inmatning): TooltipModell {
  const i = aktiv.index;
  const iso = axel.perioder[i];
  const rubrik = iso ? period(iso, axel.vy, "kort") : "";
  const f = spec.y.format;
  const fokus = spec.serier.find((s) => s.roll === "fokus");
  const rader: TooltipRad[] = [];
  const noter: string[] = [];
  if (fokus) {
    const v = vardeVid(pi, fokus.id, i);
    rader.push({ serieId: fokus.id, namn: fokus.namn, varde: varde(v, f), plats: null, farg: serieFarg(fokus), fet: true });
    const jamfor = (j: number | null) => {
      if (v === null || j === null || j < 0) return;
      const w = vardeVid(pi, fokus.id, j);
      if (w === null) return;
      rader.push({
        serieId: null, namn: `Mot ${period(axel.perioder[j], axel.vy, "kort")}`,
        varde: skillnadText(v - w, f), plats: relativText(v - w, w), farg: null, fet: false,
      });
    };
    jamfor(i - 1);
    const ifjol = sammaPeriodAretInnan(axel, i);
    if (ifjol !== i - 1) jamfor(ifjol);
    if (v === null) noter.push(`Inget värde för ${fokus.namn} ${rubrik}`);
  }
  return { rubrik, nyMetod: false, rader, noter, uppmaning: null, live: liveText(rubrik, rader, noter, null) };
}

export const stapel: Renderare = {
  typ: "stapel",
  minstaBredd: 240,
  hojd: (bredd) => standardHojd(bredd),
  layout,
  Rita: RitaStapel,
  interaktion: tidsinteraktion(stapelTooltip),
};
