// charts/typer/smaMultiplar.tsx: renderare för diagramtypen "smaMultiplar"
// (stilguiden 6.3, 6.5, 6.6, 6.7 och 6.8). Ägare: WP3.
//
// En panel per enhet i specens ordning (bäst först enligt riktningen), 3
// kolumner när diagrammet är minst 760 px, 2 vid 480–759 och 1 under 480. Alla
// paneler delar y-skala (spec.y.doman); tickvärdena står en gång, till vänster
// om första kolumnen, och rutnätet går igenom alla paneler. Panelens rubrik:
// namnet i typ.roll.granssnitt 600, senaste värdet och enhetens statusmarkör.
// Ryms inte allt på en rad står värdet och markören på en andra rad i alla
// paneler. Enheten är fokus (grön linje, slutpunkt). Överordnad nivå ritas
// streckad som referens i varje panel (för andels- och medelmått; specen
// saknar den för summamått) och etiketteras bara i första panelen. Perioder
// som ingen serie har bryter inte linjerna, som i linjediagrammet.
//
// Interaktion (karna/interaktion.ts, paneler): perioden under pekaren gäller i
// alla paneler, med hjälplinje och punkter i var och en; tooltipen står i
// panelen under pekaren med enhetens värde och överordnad nivå. Klick på
// panelens namn (eller Enter) borrar ned när figuren ger onFokus.

import { curveMonotoneX, line } from "d3";
import { period, varde } from "../../design/format";
import { kompaktHojd, smaMultiplarKolumner, tema, type Tema } from "../../design/tema";
import { GEOMETRI } from "../karna/geometri";
import { panelinteraktion } from "../karna/interaktion";
import { kortaText, textbredd } from "../karna/matt";
import { skarp } from "../karna/ritstil";
import { linjarSkala, tickText, tidsaxel, tidsskala, tidsTicks, vardeTicks } from "../karna/skalor";
import { liveText, uppmaningVerb } from "../karna/tooltipDelar";
import { serieFarg, type Inmatning, type TooltipModell, type TooltipRad } from "../karna/tooltipModell";
import type { Form, Lager, LagerId, Renderare, Scen, ScenPanel, Stopp } from "../register";
import type { ChartSpec, SpecSerie } from "../spec";
import { STATUS_ORD } from "../underlag";
import { RitaSmaMultiplar } from "./smaMultiplarRita";

type Punkt = [number, number | null];

/** Banan för en serie: lätt utjämnad (monoton) kurva, luckor bryter linjen. */
function linjeD(punkter: Punkt[], x: (i: number) => number, y: (v: number) => number): string {
  const gen = line<Punkt>().curve(curveMonotoneX).defined((d) => d[1] !== null).x((d) => x(d[0])).y((d) => y(d[1] as number));
  (gen as unknown as { digits?: (n: number) => unknown }).digits?.(1);
  return gen(punkter) ?? "";
}

/** Panelens serie och referensen. */
const panelSerier = (spec: ChartSpec) => {
  const paneler = (spec.paneler ?? []).flatMap((p) => {
    const s = spec.serier.find((x) => x.roll === "fokus" && (x.enhetId ?? x.id) === p.enhetId);
    return s ? [{ panel: p, serie: s }] : [];
  });
  return { paneler, referens: spec.serier.find((s) => s.roll === "referens") };
};

/** Seriens senaste värde (sista punkten med värde). */
const senaste = (s: SpecSerie | undefined) => [...(s?.punkter ?? [])].reverse().find((p) => p.varde !== null)?.varde ?? null;

/** Statusmarkörens bredd: texten i typ.roll.not 600 och sidoluft (stilguiden 5.1). */
const markorBredd = (ord: string, t: Tema) => textbredd(ord, t.typ.roll.not.viktStark) + 2 * t.komponent.statusmarkor.sidoluft;

/**
 * Panelernas gemensamma geometri: kolumner, tickvärden (delad skala),
 * panelbredd och höjd, och om rubriken behöver två rader.
 */
export function panelGeometri(spec: ChartSpec, bredd: number, t: Tema = tema) {
  const { paneler, referens } = panelSerier(spec);
  const k = smaMultiplarKolumner(bredd);
  const antal = Math.max(1, paneler.length);
  const rader = Math.ceil(antal / k);
  const format = spec.y.format;

  // Delad skala (stilguiden 6.3): specens domän, annars alla värden
  const alla = [...paneler.map((p) => p.serie), ...(referens ? [referens] : [])]
    .flatMap((s) => (s.punkter ?? []).map((p) => p.varde)).filter((v): v is number => v !== null && Number.isFinite(v));
  const doman = spec.y.doman ?? (alla.length ? [Math.min(...alla), Math.max(...alla)] as [number, number] : [0, 1] as [number, number]);
  const vt = vardeTicks(doman[0], doman[1], true, spec.y.noll);
  const tickTexter = vt.ticks.map((v) => tickText(v, format, vt.decimaler));
  const vanster = Math.ceil(Math.max(0, ...tickTexter.map((x) => textbredd(x))) + GEOMETRI.yKolumnLuft);
  const luftX = t.rum[5], luftY = t.rum[6];
  const panelB = Math.max(1, (bredd - vanster - (k - 1) * luftX) / k);

  // Rubriken: namn, värde och statusmarkör på en rad om alla ryms, annars två rader
  const g = t.typ.roll.granssnitt;
  const rubrikRader = paneler.some(({ panel, serie }) => {
    const v = varde(senaste(serie), format);
    const markor = panel.status ? markorBredd(STATUS_ORD[panel.status], t) + t.rum[2] : 0;
    return textbredd(panel.titel, g.viktStark, g.storlek) + t.rum[2] + textbredd(v, g.vikt, g.storlek) + markor > panelB;
  }) ? 2 : 1;
  const radH = t.komponent.statusmarkor.hojd;
  const rubrikH = rubrikRader * radH + (rubrikRader - 1) * t.rum[1];
  const diagramH = kompaktHojd(panelB);
  const panelH = rubrikH + t.rum[2] + diagramH;
  return { k, rader, vt, tickTexter, vanster, luftX, luftY, panelB, rubrikRader, radH, rubrikH, diagramH, panelH, hojd: rader * panelH + (rader - 1) * luftY };
}

function layout(spec: ChartSpec, storlek: { bredd: number; hojd: number }, t: Tema): Scen {
  const { bredd, hojd } = storlek;
  const g = panelGeometri(spec, bredd, t);
  const { paneler, referens } = panelSerier(spec);
  const axel = tidsaxel(spec);
  const n = axel.perioder.length;
  const format = spec.y.format;
  const roll = t.diagram.roll;
  const gs = t.typ.roll.granssnitt;
  const not = t.typ.roll.not;

  // Värden på periodrutnätet. Perioder som ingen serie har är inte mätta och bryter inte linjerna.
  const rutnat = (s: SpecSerie): Punkt[] => {
    const ut: Punkt[] = Array.from({ length: n }, (_, i) => [i, null]);
    s.punkter?.forEach((p) => {
      const i = axel.index.get(p.period.slice(0, 10));
      if (i !== undefined && p.varde !== null && Number.isFinite(p.varde)) ut[i] = [i, p.varde];
    });
    return ut;
  };
  const varden = new Map<string, Punkt[]>();
  for (const s of [...paneler.map((p) => p.serie), ...(referens ? [referens] : [])]) varden.set(s.id, rutnat(s));
  const matt = new Set<number>();
  for (const v of varden.values()) for (const [i, val] of v) if (val !== null) matt.add(i);
  for (const [id, v] of varden) varden.set(id, v.filter(([i]) => matt.has(i)));

  const sistaText = n ? period(axel.perioder[n - 1], axel.vy, "axel") : "";
  const hogerInre = Math.max(t.rum[2], Math.ceil(textbredd(sistaText) / 2));

  const lager = new Map<LagerId, Lager>();
  const lagg = (id: LagerId, form: Form, serieId?: string) => {
    let l = lager.get(id);
    if (!l) { l = { id, serieIds: [], former: [] }; lager.set(id, l); }
    l.former.push(form);
    if (serieId && !l.serieIds.includes(serieId)) l.serieIds.push(serieId);
  };
  const rutnatFarg = t.farg.diagram.rutnat;
  const stopp: Stopp[] = [];
  const scenPaneler: ScenPanel[] = [];
  let forstaPlot: Scen["plot"] | null = null;
  let xTicks: Scen["xTicks"] = [];
  let yTicks: Scen["yTicks"] = [];

  paneler.forEach(({ panel, serie }, nr) => {
    const kol = nr % g.k, rad = Math.floor(nr / g.k);
    const px = g.vanster + kol * (g.panelB + g.luftX);
    const py = rad * (g.panelH + g.luftY);
    const plot = {
      x: px,
      y: py + g.rubrikH + t.rum[2] + GEOMETRI.marginalTopp,
      b: Math.max(1, g.panelB - hogerInre),
      h: Math.max(1, g.diagramH - GEOMETRI.marginalTopp - GEOMETRI.axelrad),
    };
    const xs = tidsskala(n, plot.x, plot.x + plot.b);
    const ys = linjarSkala([g.vt.ticks[0], g.vt.ticks[g.vt.ticks.length - 1]], plot.y + plot.h, plot.y);
    const x = (i: number) => xs(i);
    const ticksHar = tidsTicks(axel, x).map((tk) => ({ v: axel.perioder[tk.index], x: tk.x, text: tk.text }));
    if (nr === 0) {
      forstaPlot = plot;
      xTicks = ticksHar;
      yTicks = g.vt.ticks.map((v, i) => ({ v, y: ys(v), text: g.tickTexter[i] }));
    }

    // Rutnät, tickvärden (bara första kolumnen) och tidsaxel
    g.vt.ticks.forEach((v, i) => {
      const y = ys(v);
      lagg("axel", { typ: "streck", x1: plot.x, y1: y, x2: plot.x + plot.b, y2: y, farg: rutnatFarg, bredd: t.diagram.rutnat.bredd, streck: t.diagram.rutnat.streck });
      if (kol === 0) {
        lagg("axel", { typ: "text", x: plot.x - GEOMETRI.yEtikettLuft, y: y + GEOMETRI.textMitt, text: g.tickTexter[i], farg: t.farg.diagram.axeltext, vikt: not.vikt, storlek: not.storlek, ankare: "end", halo: false });
      }
    });
    const bas = skarp(plot.y + plot.h);
    const axelFarg = t.farg.diagram.axel;
    lagg("axel", { typ: "streck", x1: plot.x, y1: bas, x2: plot.x + plot.b, y2: bas, farg: axelFarg, bredd: t.diagram.xAxel.baslinje, streck: null });
    for (const tk of ticksHar) {
      lagg("axel", { typ: "streck", x1: skarp(tk.x), y1: bas, x2: skarp(tk.x), y2: bas + t.diagram.xAxel.streckLangd, farg: axelFarg, bredd: t.diagram.xAxel.baslinje, streck: null });
      lagg("axel", { typ: "text", x: tk.x, y: plot.y + plot.h + GEOMETRI.xEtikettBaslinje, text: tk.text, farg: t.farg.diagram.axeltext, vikt: not.vikt, storlek: not.storlek, ankare: "middle", halo: false });
    }

    // Rubriken: namnet (ritas av Rita med pekaryta), senaste värdet och statusmarkören
    const vardeText = varde(senaste(serie), format);
    const vardeB = textbredd(vardeText, gs.vikt, gs.storlek);
    const ord = panel.status ? STATUS_ORD[panel.status] : null;
    const mB = ord ? markorBredd(ord, t) : 0;
    const enRad = g.rubrikRader === 1;
    const namnMax = enRad ? g.panelB - t.rum[2] - vardeB - (ord ? t.rum[2] + mB : 0) : g.panelB;
    const namn = kortaText(panel.titel, Math.max(0, namnMax), gs.viktStark, gs.storlek);
    const namnB = textbredd(namn, gs.viktStark, gs.storlek);
    const rad2 = py + g.radH + t.rum[1];
    const vardeX = enRad ? px + namnB + t.rum[2] : px;
    const vardeMitt = (enRad ? py : rad2) + g.radH / 2;
    lagg("axel", { typ: "text", serieId: serie.id, x: vardeX, y: vardeMitt + gs.storlek * 0.35, text: vardeText, farg: t.farg.black, vikt: gs.vikt, storlek: gs.storlek, ankare: "start", halo: false });
    if (ord && panel.status) {
      const st = t.farg.status[panel.status];
      const mx = vardeX + vardeB + t.rum[2];
      lagg("axel", { typ: "rekt", serieId: serie.id, x: mx, y: vardeMitt - g.radH / 2, b: mB, h: g.radH, farg: st.botten, radie: g.radH / 2 });
      lagg("axel", { typ: "text", serieId: serie.id, x: mx + mB / 2, y: vardeMitt + not.storlek * 0.35, text: ord, farg: st.text, vikt: not.viktStark, storlek: not.storlek, ankare: "middle", halo: false });
    }

    // Referensen (överordnad nivå) och enheten
    const panelStopp: Stopp[] = [];
    const y = (v: number) => ys(v);
    if (referens) {
      const v = varden.get(referens.id) ?? [];
      const r = roll.referens;
      lagg("referens", { typ: "linje", serieId: referens.id, d: linjeD(v, x, y), farg: r.farg, bredd: r.bredd, streck: r.streck }, referens.id);
      const sista = [...v].reverse().find((d) => d[1] !== null);
      if (sista) lagg("referens", { typ: "punkt", serieId: referens.id, x: x(sista[0]), y: y(sista[1] as number), r: r.punktradie, farg: r.farg }, referens.id);
      for (const [i, val] of v) if (val !== null) panelStopp.push({ serieId: referens.id, index: i, x: x(i), y: y(val), varde: val });
    }
    const v = varden.get(serie.id) ?? [];
    const f = roll.fokus;
    lagg("fokus", { typ: "linje", serieId: serie.id, d: linjeD(v, x, y), farg: f.farg, bredd: f.bredd, streck: f.streck }, serie.id);
    const sista = [...v].reverse().find((d) => d[1] !== null);
    // En punkt per period när perioderna står glest nog (som linjediagrammet)
    const periodPunkter = n > 1 && plot.b / (n - 1) >= t.diagram.punkter.minstaAvstand;
    v.forEach(([i, val], j) => {
      if (val === null) return;
      const ensam = (j === 0 || v[j - 1][1] === null) && (j === v.length - 1 || v[j + 1][1] === null);
      if (sista && i !== sista[0] && (periodPunkter || ensam)) {
        lagg("fokus", { typ: "punkt", serieId: serie.id, x: x(i), y: y(val), r: periodPunkter ? f.punktradiePeriod : f.punktradieEnsam, farg: f.farg, kant: t.diagram.punkter.kant }, serie.id);
      }
      const s: Stopp = { serieId: serie.id, index: i, x: x(i), y: y(val), varde: val };
      panelStopp.push(s);
      stopp.push(s);
    });
    if (sista) lagg("fokus", { typ: "punkt", serieId: serie.id, x: x(sista[0]), y: y(sista[1] as number), r: f.punktradie - 1, farg: f.farg, kant: t.diagram.punkter.kant }, serie.id);

    // Referensens etikett bara i första panelen (stilguiden 6.6), vid linjeslutet på den sida där enheten inte är
    if (nr === 0 && referens) {
      const rv = [...(varden.get(referens.id) ?? [])].reverse().find((d) => d[1] !== null);
      if (rv) {
        const yr = y(rv[1] as number);
        const yf = sista ? y(sista[1] as number) : plot.y + plot.h;
        const text = spec.etiketter.find((e) => e.serieId === referens.id)?.text || referens.namn;
        const over = yr <= yf;
        const ty = over ? yr - t.rum[2] : yr + t.rum[2] + not.storlek * 0.7;
        lagg("punkter", {
          typ: "text", serieId: referens.id, x: x(rv[0]), y: Math.max(plot.y + not.storlek, Math.min(plot.y + plot.h - t.rum[1], ty)),
          text: kortaText(text, plot.b, not.vikt), farg: roll.referens.farg, vikt: not.vikt, storlek: not.storlek, ankare: "end", halo: true,
        }, referens.id);
      }
    }

    scenPaneler.push({
      serieId: serie.id,
      enhetId: panel.enhetId,
      x: px, y: py, b: g.panelB, h: g.panelH,
      plot,
      namn: { text: namn, x: px, y: py, b: namnB, h: g.radH },
      stopp: panelStopp.sort((a, b) => a.index - b.index || (a.serieId === serie.id ? 1 : -1)),
    });
  });

  return {
    bredd, hojd,
    plot: forstaPlot ?? { x: g.vanster, y: 0, b: g.panelB, h: hojd },
    xTicks, yTicks,
    lager: [...lager.values()],
    etiketter: [],
    stopp,
    paneler: scenPaneler,
  };
}

// ── Tooltip ──

/**
 * Tooltipen i panelen under pekaren (stilguiden 6.8): perioden, enhetens värde
 * och överordnad nivå, sorterade efter värde, enheten i 600. När figuren kan
 * borra ned står uppmaningen sist.
 */
export function panelTooltip(spec: ChartSpec, panel: ScenPanel, index: number, satt: Inmatning, nedborrning: boolean): TooltipModell {
  const axel = tidsaxel(spec);
  const iso = axel.perioder[index];
  const rubrik = iso ? period(iso, axel.vy, "kort") : "";
  const f = spec.y.format;
  const vid = (s: SpecSerie) => s.punkter?.find((p) => axel.index.get(p.period.slice(0, 10)) === index);
  const serie = spec.serier.find((s) => s.id === panel.serieId);
  const referens = spec.serier.find((s) => s.roll === "referens");
  const kandidater = [serie, referens].filter((s): s is SpecSerie => !!s);
  const rader: TooltipRad[] = kandidater
    .map((s) => ({ s, p: vid(s) }))
    .filter((x) => x.p && (x.p.varde !== null || x.p.undertryckt))
    .sort((a, b) => (b.p?.varde ?? -Infinity) - (a.p?.varde ?? -Infinity))
    .map(({ s, p }) => ({
      serieId: s.id, namn: s.namn, varde: varde(p?.varde ?? null, f, "tabell", !!p?.undertryckt), plats: null,
      farg: serieFarg(s), fet: s.id === panel.serieId,
    }));
  const noter: string[] = [];
  const egen = serie ? vid(serie) : undefined;
  if (serie && (!egen || egen.varde === null)) {
    noter.push(egen?.undertryckt ? `För få fall för ${serie.namn} ${rubrik}` : `Inget värde för ${serie.namn} ${rubrik}`);
  }
  const namn = serie?.namn ?? panel.namn.text;
  const uppmaning = nedborrning
    ? satt === "tangent" ? `Tryck Enter för att visa ${namn}` : `${uppmaningVerb(satt, "Tryck")} på namnet för att visa ${namn}`
    : null;
  return { rubrik, nyMetod: false, rader, noter, uppmaning, live: liveText(rubrik, rader, noter, uppmaning) };
}

export const smaMultiplar: Renderare = {
  typ: "smaMultiplar",
  minstaBredd: 240,
  hojd: (bredd, spec) => panelGeometri(spec, bredd).hojd,
  layout,
  Rita: RitaSmaMultiplar,
  interaktion: panelinteraktion(panelTooltip),
};
