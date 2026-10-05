// charts/typer/linje.tsx: renderare för diagramtypen "linje" (stilguiden 6.4,
// 6.6 och 6.8). Förlaga: linjediagrammet i docs/referens/stilguide-granskning.html
// (exempel 1.1). Ägare: WP2.
//
// Roller: fokus (2,5 px, slutpunkt r 4,5, ensamma värden r 3), referens
// (1,5 px streckad 6 4, slutpunkt r 3), kontext (0,8 px, inga punkter),
// kontextAktiv (lyft kontextlinje i överlägget, 1,75 px), markerad (fästa,
// 2 px, slutpunkt r 3), forvantat (ett band, punkter utanför markeras med form
// och kort etikett), mal (1 px streckad 2 2). Raka linjer, luckor bryter
// linjen, inga legender, inga zoner, ingen halo under linjerna.

import { area, line } from "d3";
import type { Punkt } from "../../data/modell";
import { period, varde } from "../../design/format";
import { kompaktHojd, standardHojd, type Tema } from "../../design/tema";
import { hogermarginal, placeraEtiketter, type EtikettUnderlag } from "../karna/etiketter";
import { arFastbar } from "../karna/fasta";
import { GEOMETRI } from "../karna/geometri";
import { textbredd } from "../karna/matt";
import { RitaTid } from "../karna/Overlagg";
import { skarp } from "../karna/ritstil";
import { linjarSkala, tickText, tidsaxel, tidsskala, tidsTicks, vardeTicks } from "../karna/skalor";
import { byggPunktIndex, forvantatStatus, seriebrottIndex } from "../karna/tooltipModell";
import type { Etikett, Form, Lager, LagerId, Renderare, Scen, Stopp } from "../register";
import type { ChartSpec, SpecSerie } from "../spec";

type Linjepunkt = [number, number | null];

/** Banan för en serie: raka linjer, luckor bryter linjen. */
function linjeD(punkter: Linjepunkt[], x: (i: number) => number, y: (v: number) => number): string {
  const gen = line<Linjepunkt>()
    .defined((d) => d[1] !== null)
    .x((d) => x(d[0]))
    .y((d) => y(d[1] as number));
  (gen as unknown as { digits?: (n: number) => unknown }).digits?.(1);
  return gen(punkter) ?? "";
}

/** Bandet för förväntat intervall. */
function bandD(punkter: [number, number, number][], x: (i: number) => number, y: (v: number) => number): string {
  const gen = area<[number, number, number]>()
    .x((d) => x(d[0]))
    .y0((d) => y(d[1]))
    .y1((d) => y(d[2]));
  (gen as unknown as { digits?: (n: number) => unknown }).digits?.(1);
  return gen(punkter) ?? "";
}

/** Seriens värden på periodrutnätet. */
function rutnatsvarden(s: SpecSerie, index: Map<string, number>, n: number): Linjepunkt[] {
  const ut: Linjepunkt[] = Array.from({ length: n }, (_, i) => [i, null]);
  s.punkter?.forEach((p) => {
    const i = index.get(p.period.slice(0, 10));
    if (i !== undefined && p.varde !== null && Number.isFinite(p.varde)) ut[i] = [i, p.varde];
  });
  return ut;
}

const sistaDefinierade = (v: Linjepunkt[]) => {
  for (let i = v.length - 1; i >= 0; i--) if (v[i][1] !== null) return v[i] as [number, number];
  return null;
};

const ensamma = (v: Linjepunkt[]) =>
  v.filter((d, i) => d[1] !== null && (i === 0 || v[i - 1][1] === null) && (i === v.length - 1 || v[i + 1][1] === null)) as [number, number][];

const LINJEROLLER = new Set(["fokus", "referens", "kontext", "markerad"]);

/** Etikettens färg och vikt per roll (stilguiden 6.4). */
function etikettStil(s: SpecSerie, t: Tema): { farg: string; vikt: number; prioritet: number } {
  const stark = t.typ.roll.not.viktStark;
  const r = t.diagram.roll;
  switch (s.roll) {
    case "fokus": return { farg: t.farg.fokus, vikt: stark, prioritet: 6 };
    case "referens": return { farg: r.referens.farg, vikt: 400, prioritet: 5 };
    case "markerad": return { farg: r.markerad.farg[(s.markeringIndex ?? 0) % r.markerad.farg.length], vikt: stark, prioritet: 4 };
    case "forvantat": return { farg: t.farg.text2, vikt: 400, prioritet: 4 };
    case "mal": return { farg: r.mal.farg, vikt: 400, prioritet: 3 };
    default: return { farg: t.farg.text3, vikt: 400, prioritet: 1 };
  }
}

function layout(spec: ChartSpec, storlek: { bredd: number; hojd: number }, t: Tema): Scen {
  const { bredd, hojd } = storlek;
  const axel = tidsaxel(spec);
  const n = axel.perioder.length;
  const sistaIndex = Math.max(0, n - 1);
  const smal = bredd < GEOMETRI.smal;
  const roll = t.diagram.roll;
  const format = spec.y.format;

  // ── Värden och domän ──
  const varden = new Map<string, Linjepunkt[]>();
  let min = Infinity, max = -Infinity;
  const ta = (v: number) => { if (v < min) min = v; if (v > max) max = v; };
  for (const s of spec.serier) {
    if (LINJEROLLER.has(s.roll)) {
      const v = rutnatsvarden(s, axel.index, n);
      varden.set(s.id, v);
      v.forEach((d) => d[1] !== null && ta(d[1]));
    }
    if (s.roll === "forvantat") s.intervall?.forEach((iv) => { ta(iv.lo); ta(iv.hi); });
    if (s.roll === "mal" && s.varde !== undefined) ta(s.varde);
  }
  if (spec.y.doman) { min = spec.y.doman[0]; max = spec.y.doman[1]; }
  const vt = vardeTicks(min, max, smal, spec.y.noll);
  const tickTexter = vt.ticks.map((v) => tickText(v, format, vt.decimaler));
  const vanster = Math.ceil(Math.max(0, ...tickTexter.map((x) => textbredd(x))) + GEOMETRI.yKolumnLuft);

  // ── Etiketternas underlag (utan y) och högermarginalen ──
  const serieAv = new Map(spec.serier.map((s) => [s.id, s]));
  // Ankaret är linjeslutet: seriens sista värde (som kan ligga före sista
  // perioden), bandets sista mittpunkt eller mållinjens höger ände.
  const underlag: (Omit<EtikettUnderlag, "ankarY"> & { ankarVarde: number; ankarIndex: number })[] = [];
  for (const e of spec.etiketter) {
    const s = serieAv.get(e.serieId);
    if (!s || underlag.some((u) => u.serieId === s.id)) continue;
    let ankare: [number, number] | null = null;
    let text = e.text;
    if (LINJEROLLER.has(s.roll)) ankare = sistaDefinierade(varden.get(s.id) ?? []);
    else if (s.roll === "forvantat") {
      const sista = s.intervall?.[s.intervall.length - 1];
      const i = sista ? axel.index.get(sista.x.slice(0, 10)) : undefined;
      ankare = sista && i !== undefined ? [i, (sista.lo + sista.hi) / 2] : null;
    } else if (s.roll === "mal" && s.varde !== undefined) {
      ankare = [sistaIndex, s.varde];
      if (!text) text = `Mål ${varde(s.varde, format)}`;
    }
    if (ankare === null) continue;
    underlag.push({ serieId: s.id, text, ankarIndex: ankare[0], ankarVarde: ankare[1], interaktiv: arFastbar(s), ...etikettStil(s, t) });
  }
  const sistaText = n ? period(axel.perioder[sistaIndex], axel.vy, "axel") : "";
  const hoger = Math.max(
    hogermarginal(underlag, bredd),
    Math.ceil(textbredd(sistaText) / 2) + GEOMETRI.hogerMin / 2,
  );

  // ── Plotyta och skalor ──
  const plot = {
    x: vanster,
    y: GEOMETRI.marginalTopp,
    b: Math.max(1, bredd - vanster - hoger),
    h: Math.max(1, hojd - GEOMETRI.marginalTopp - GEOMETRI.axelrad),
  };
  const xs = tidsskala(n, plot.x, plot.x + plot.b);
  const ys = linjarSkala([vt.ticks[0], vt.ticks[vt.ticks.length - 1]], plot.y + plot.h, plot.y);
  const x = (i: number) => xs(i);
  const y = (v: number) => ys(v);
  const xTicks = tidsTicks(axel, x).map((tk) => ({ v: axel.perioder[tk.index], x: tk.x, text: tk.text }));
  const yTicks = vt.ticks.map((v, i) => ({ v, y: y(v), text: tickTexter[i] }));

  // ── Lager ──
  const lager = new Map<LagerId, Lager>();
  const lagg = (id: LagerId, f: Form, serieId?: string) => {
    let l = lager.get(id);
    if (!l) { l = { id, serieIds: [], former: [] }; lager.set(id, l); }
    l.former.push(f);
    if (serieId && !l.serieIds.includes(serieId)) l.serieIds.push(serieId);
  };

  // Seriebrott: ett streck på tidsaxeln och "ny metod" i axelns rad om det får plats
  const brott = seriebrottIndex(spec, axel);
  if (brott !== null && n > 1) {
    const xb = skarp(x(brott));
    const bas = skarp(plot.y + plot.h);
    const sb = t.diagram.seriebrott;
    lagg("axel", { typ: "streck", x1: xb, y1: bas - GEOMETRI.seriebrottOver, x2: xb, y2: bas - GEOMETRI.seriebrottOver + sb.langd, farg: t.farg.text3, bredd: sb.bredd, streck: null });
    const text = "ny metod";
    const b = textbredd(text, 400, GEOMETRI.textStorlekLiten);
    const fri = xTicks.every((tk) => {
      const tb = textbredd(tk.text);
      return x(brott) + b / 2 + GEOMETRI.xEtikettLuft / 2 < tk.x - tb / 2 || x(brott) - b / 2 - GEOMETRI.xEtikettLuft / 2 > tk.x + tb / 2;
    });
    if (fri) {
      lagg("axel", { typ: "text", x: x(brott), y: plot.y + plot.h + GEOMETRI.xEtikettBaslinje, text, farg: t.farg.text3, vikt: 400, storlek: GEOMETRI.textStorlekLiten, ankare: "middle", halo: false });
    }
  }

  const stopp: Stopp[] = [];
  const fokus = spec.serier.find((s) => s.roll === "fokus");

  for (const s of spec.serier) {
    const v = varden.get(s.id);
    switch (s.roll) {
      case "forvantat": {
        const band = (s.intervall ?? [])
          .map((iv) => [axel.index.get(iv.x.slice(0, 10)), iv.lo, iv.hi] as const)
          .filter((d): d is [number, number, number] => d[0] !== undefined)
          .sort((a, b) => a[0] - b[0]);
        if (band.length) lagg("band", { typ: "yta", serieId: s.id, d: bandD(band, x, y), farg: roll.forvantat.farg }, s.id);
        break;
      }
      case "mal": {
        if (s.varde === undefined) break;
        const ym = y(s.varde);
        lagg("mal", { typ: "streck", x1: plot.x, y1: ym, x2: plot.x + plot.b, y2: ym, farg: roll.mal.farg, bredd: roll.mal.bredd, streck: roll.mal.streck }, s.id);
        break;
      }
      case "kontext": {
        if (!v) break;
        lagg("kontext", { typ: "linje", serieId: s.id, d: linjeD(v, x, y), farg: roll.kontext.farg, bredd: roll.kontext.bredd, streck: roll.kontext.streck }, s.id);
        break;
      }
      case "referens":
      case "markerad":
      case "fokus": {
        if (!v) break;
        const r = s.roll === "fokus" ? roll.fokus : s.roll === "referens" ? roll.referens : roll.markerad;
        const farg = s.roll === "markerad"
          ? roll.markerad.farg[(s.markeringIndex ?? 0) % roll.markerad.farg.length]
          : s.roll === "fokus" ? roll.fokus.farg : roll.referens.farg;
        const id: LagerId = s.roll;
        lagg(id, { typ: "linje", serieId: s.id, d: linjeD(v, x, y), farg, bredd: r.bredd, streck: r.streck }, s.id);
        const sista = sistaDefinierade(v);
        // Ensamma värden mellan luckor (inte för riket, som stilguiden 6.4)
        if (s.roll !== "referens") {
          const re = s.roll === "fokus" ? roll.fokus.punktradieEnsam : roll.markerad.punktradie;
          for (const [i, val] of ensamma(v)) {
            if (sista && i === sista[0]) continue;
            lagg(id, { typ: "punkt", serieId: s.id, x: x(i), y: y(val), r: re, farg }, s.id);
          }
        }
        if (sista) lagg(id, { typ: "punkt", serieId: s.id, x: x(sista[0]), y: y(sista[1]), r: r.punktradie, farg }, s.id);
        break;
      }
    }
    if (v && LINJEROLLER.has(s.roll)) {
      for (const [i, val] of v) if (val !== null) stopp.push({ serieId: s.id, index: i, x: x(i), y: y(val), varde: val });
    }
  }

  // Punkter utanför förväntat intervall: triangel ovan eller under, romb långt
  // utanför. Vilka punkter som är utanför bestäms av fokuspunkternas signal
  // och markeras bara när specen har ett förväntat intervall.
  const forv = spec.serier.find((s) => s.roll === "forvantat");
  if (forv && fokus) {
    const iv = new Map((forv.intervall ?? []).map((d) => [axel.index.get(d.x.slice(0, 10)), d]));
    const pi = byggPunktIndex(spec, axel);
    const avvikande: { i: number; p: Punkt; status: "gul" | "rod" }[] = [];
    pi.get(fokus.id)?.forEach((d, i) => {
      if (!d || d.punkt.varde === null) return;
      const st = forvantatStatus(d.punkt);
      if (st === "gul" || st === "rod") avvikande.push({ i, p: d.punkt, status: st });
    });
    const upptagna: [number, number, number, number][] = [];
    const etiketter = avvikande.length <= GEOMETRI.avvikelseEtiketterMax;
    for (const a of avvikande) {
      const val = a.p.varde as number;
      const cx = x(a.i), cy = y(val);
      const ivp = iv.get(a.i);
      const mitt = a.p.yhat ?? (ivp ? (ivp.lo + ivp.hi) / 2 : val);
      const over = val > mitt;
      lagg("punkter", {
        typ: "markor", serieId: fokus.id, x: cx, y: cy, storlek: roll.forvantat.markor,
        form: a.status === "rod" ? "romb" : over ? "upp" : "ned",
        farg: a.status === "rod" ? t.diagram.avvikelse.langtUtanfor : t.diagram.avvikelse.utanfor,
      }, fokus.id);
      if (!etiketter) continue;
      const text = `${period(axel.perioder[a.i], axel.vy, "axel")}, ${over ? "över" : "under"} intervallet`;
      const b = textbredd(text);
      const g = GEOMETRI.avvikelseEtikett;
      const vanstra = cx - g.dx - b >= plot.x;
      const tx = vanstra ? cx - g.dx : cx + g.dx;
      const ty = over ? cy - g.dy : cy + g.dy + GEOMETRI.textMitt * 2;
      const ruta: [number, number, number, number] = vanstra ? [tx - b, ty - GEOMETRI.textStorlek, tx, ty + 3] : [tx, ty - GEOMETRI.textStorlek, tx + b, ty + 3];
      if (upptagna.some((u) => ruta[0] < u[2] && u[0] < ruta[2] && ruta[1] < u[3] && u[1] < ruta[3])) continue;
      upptagna.push(ruta);
      lagg("punkter", { typ: "text", serieId: fokus.id, x: tx, y: ty, text, farg: t.farg.text2, vikt: 400, storlek: GEOMETRI.textStorlek, ankare: vanstra ? "end" : "start", halo: true }, fokus.id);
    }
  }

  // ── Etikettkolumnen ──
  const xSista = n ? x(sistaIndex) : plot.x + plot.b;
  const placerade = placeraEtiketter(
    underlag.map((u) => ({ ...u, ankarY: y(u.ankarVarde) })),
    plot.y + t.rum[1],
    plot.y + plot.h,
    bredd,
  );
  const etiketter: Etikett[] = placerade.map((e) => ({
    serieId: e.serieId,
    text: e.rader.join(" "),
    rader: e.rader,
    helText: e.text,
    x: xSista + t.diagram.etikett.kolumnAvstand,
    y: e.y,
    textbredd: Math.max(...e.rader.map((r) => textbredd(r, e.vikt))),
    ankarX: x(e.ankarIndex) + GEOMETRI.koppling.start,
    ankarY: e.ankarY,
    farg: e.farg,
    vikt: e.vikt,
    interaktiv: e.interaktiv,
  }));

  return {
    bredd, hojd, plot, xTicks, yTicks,
    lager: [...lager.values()],
    etiketter,
    stopp,
  };
}

export const linje: Renderare = {
  typ: "linje",
  minstaBredd: 240,
  hojd: (bredd, spec) => (spec.hojdklass === "kompakt" ? kompaktHojd(bredd) : standardHojd(bredd)),
  layout,
  Rita: RitaTid,
};
