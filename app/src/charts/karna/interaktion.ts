// charts/karna/interaktion.ts: interaktionslagrets regler som rena funktioner
// (stilguiden 6.8). Diagram.tsx kopplar dem till pekar- och tangenthändelser.
// Ägare: WP2.
//
//   Mus        hovra: period under pekaren, linje inom 8 px lyfts (tröghet i
//              traff.ts); klick på lyft fästbar linje eller dess etikett fäster
//              eller tar bort.
//   Tangenter  ← → mellan perioder, Home/End, ↑ ↓ växlar serie (Halland,
//              riket, fästa, sedan övriga efter värde), Enter fäster, Escape stänger.
//   Pekskärm   tryck visar, tryck igen på samma linje fäster, tryck utanför stänger.
//
// Tillägg i WP3: ett gemensamt gränssnitt (Interaktion) som varje graftyp
// ger Diagram.tsx, med samma tangentbordsmönster och samma tooltip överallt:
//   tid        linje och stapel: reglerna ovan (tidsinteraktion)
//   rader      rangordning: raden under pekaren (närmaste rad i höjdled, hela
//              raden från namnet till högerkanten), ↑ ↓ mellan rader,
//              Home/End, Enter fäster (radinteraktion). Tillägg i WP10: i
//              enheternas rangordning (spec.borrbar) borrar klick och Enter
//              ned i raden i stället, när figuren kan (Interaktiv.borra)
//   paneler    små multiplar: perioden är gemensam för alla paneler
//              (synkroniserad hjälplinje), panelen under pekaren får tooltipen,
//              ← → mellan perioder, ↑ ↓ mellan paneler, Enter borrar ned
//              (panelinteraktion)

import type { AktivPunkt, Scen, ScenPanel, Stopp } from "../register";
import type { ChartSpec, SpecSerie } from "../spec";
import { GEOMETRI } from "./geometri";
import { arFastbar } from "./fasta";
import { tidsaxel, type Tidsaxel } from "./skalor";
import { byggPunktIndex, tooltipModell, type Inmatning, type PunktIndex, type TooltipModell } from "./tooltipModell";
import { byggPolylinjer, STANDARDREGLER, valjLinje, type Polylinje, type Traffregler } from "./traff";

export interface Traffmodell {
  perioder: { index: number; x: number }[];   // perioder med minst ett värde, i ordning
  linjer: Polylinje[];
  stoppPerSerie: Map<string, Stopp[]>;          // per serie, i periodordning
  plot: Scen["plot"];
  bredd: number;
}

export function byggTraffmodell(scen: Scen, spec: ChartSpec): Traffmodell {
  const roll = new Map(spec.serier.map((s) => [s.id, s.roll]));
  const foretrade = (id: string) => {
    const r = roll.get(id);
    return r === "fokus" || r === "referens" || r === "markerad";
  };
  const linjer = byggPolylinjer(scen.stopp, foretrade, (id) => roll.get(id) !== "kontext");
  const stoppPerSerie = new Map<string, Stopp[]>();
  const perIndex = new Map<number, number>();
  for (const s of scen.stopp) {
    const l = stoppPerSerie.get(s.serieId);
    if (l) l.push(s); else stoppPerSerie.set(s.serieId, [s]);
    perIndex.set(s.index, s.x);
  }
  for (const l of stoppPerSerie.values()) l.sort((a, b) => a.index - b.index);
  const perioder = [...perIndex].map(([index, x]) => ({ index, x })).sort((a, b) => a.index - b.index);
  return { perioder, linjer, stoppPerSerie, plot: scen.plot, bredd: scen.bredd };
}

/** Om pekaren står i plotytan (med lite marginal), där hovring gäller. */
export function iPlotytan(m: Traffmodell, px: number, py: number): boolean {
  const g = GEOMETRI.traffMarginal;
  const { plot } = m;
  return px >= plot.x - g && px <= plot.x + plot.b + GEOMETRI.traffHoger && py >= 0 && py <= plot.y + plot.h + g;
}

/** Närmaste period (med värden) till pekarens x. */
export function narmastePeriod(m: Traffmodell, px: number): number | null {
  const p = m.perioder;
  if (p.length === 0) return null;
  let lo = 0, hi = p.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (p[mid].x < px) lo = mid; else hi = mid;
  }
  return Math.abs(p[lo].x - px) <= Math.abs(p[hi].x - px) ? p[lo].index : p[hi].index;
}

/** Ny aktiv punkt när pekaren står på (px, py). `nu` ger trögheten. */
export function pekarlage(
  m: Traffmodell,
  px: number,
  py: number,
  nu: AktivPunkt | null,
  regler: Traffregler = STANDARDREGLER,
): AktivPunkt | null {
  const index = narmastePeriod(m, px);
  if (index === null) return null;
  return { index, serieId: valjLinje(m.linjer, px, py, nu?.serieId ?? null, regler) };
}

/** Lyftradien på pekskärm: större än musens så att linjen går att träffa med fingret. */
export const PEKSKARMSREGLER: Traffregler = {
  ...STANDARDREGLER,
  lyft: GEOMETRI.pekskarmLyft,
  slapp: Math.max(STANDARDREGLER.slapp, GEOMETRI.pekskarmLyft),
};

/** Sista perioden med värde för fokusserien, annars sista perioden med något värde. */
export function startlage(m: Traffmodell, spec: ChartSpec): AktivPunkt | null {
  const fokus = spec.serier.find((s) => s.roll === "fokus");
  const f = fokus ? m.stoppPerSerie.get(fokus.id) : undefined;
  const index = f?.length ? f[f.length - 1].index : m.perioder[m.perioder.length - 1]?.index;
  if (index === undefined) return null;
  return { index, serieId: fokus && f?.length ? fokus.id : null };
}

/** Seriernas ordning för ↑ ↓: Halland, riket, fästa, sedan övriga efter värde. */
export function serieordning(m: Traffmodell, spec: ChartSpec, index: number): string[] {
  const varde = (s: SpecSerie) => m.stoppPerSerie.get(s.id)?.find((x) => x.index === index)?.varde ?? null;
  const roll = (r: SpecSerie["roll"]) => spec.serier.filter((s) => s.roll === r && m.stoppPerSerie.has(s.id));
  const markerade = roll("markerad").sort((a, b) => (a.markeringIndex ?? 0) - (b.markeringIndex ?? 0));
  const ovriga = roll("kontext")
    .map((s) => ({ s, v: varde(s) }))
    .filter((x): x is { s: SpecSerie; v: number } => x.v !== null)
    .sort((a, b) => b.v - a.v)
    .map((x) => x.s);
  return [...roll("fokus"), ...roll("referens"), ...markerade, ...ovriga].map((s) => s.id);
}

export interface Tangentutfall {
  hanterad: boolean;
  aktiv: AktivPunkt | null;
  vaxla?: string;           // serie-id att fästa eller ta bort
  fokus?: string;           // enhets-id att borra ned till (små multiplar)
}

/** Tangentbordets regler. Okända tangenter lämnas ohanterade. */
export function tangent(
  nyckel: string,
  m: Traffmodell,
  spec: ChartSpec,
  aktiv: AktivPunkt | null,
): Tangentutfall {
  const start = aktiv ?? startlage(m, spec);
  if (!start) return { hanterad: false, aktiv };
  const perioder = m.perioder.map((p) => p.index);
  const pos = Math.max(0, perioder.indexOf(start.index));
  switch (nyckel) {
    case "ArrowRight":
    case "ArrowLeft": {
      const ny = Math.max(0, Math.min(perioder.length - 1, pos + (nyckel === "ArrowRight" ? 1 : -1)));
      return { hanterad: true, aktiv: { index: perioder[ny], serieId: start.serieId } };
    }
    case "Home":
    case "End":
      return { hanterad: true, aktiv: { index: nyckel === "Home" ? perioder[0] : perioder[perioder.length - 1], serieId: start.serieId } };
    case "ArrowDown":
    case "ArrowUp": {
      const ordning = serieordning(m, spec, start.index);
      if (ordning.length === 0) return { hanterad: true, aktiv: start };
      const i = ordning.indexOf(start.serieId ?? "");
      const steg = nyckel === "ArrowDown" ? 1 : -1;
      const ny = i < 0 ? 0 : (i + steg + ordning.length) % ordning.length;
      return { hanterad: true, aktiv: { index: start.index, serieId: ordning[ny] } };
    }
    case "Enter": {
      const s = start.serieId ? spec.serier.find((x) => x.id === start.serieId) : undefined;
      if (s && arFastbar(s)) return { hanterad: true, aktiv: start, vaxla: s.id };
      return { hanterad: aktiv !== null, aktiv: start };
    }
    case "Escape":
      return { hanterad: aktiv !== null, aktiv: null };
    default:
      return { hanterad: false, aktiv };
  }
}

// ════════════════════════════════════════════════════════════
//  Gemensamt gränssnitt för graftyperna (tillägg i WP3)
// ════════════════════════════════════════════════════════════

/** En yta i svg:ns koordinater. */
export interface Yta { x: number; y: number; b: number; h: number }

/** Tooltipens innehåll och läge (karna/Tooltip.tsx placerar den). */
export interface TooltipLage {
  modell: TooltipModell;
  /** Hjälplinjens x, eller radens punkt i rangordningen. */
  x: number;
  /**
   * Radens y i rangordningen. Tooltipen står då vid raden, på andra sidan av
   * plotytans mitt än punkten, i stället för i plotytans överkant.
   */
  y?: number;
  /** Ytan som tooltipen hör till och byter sida i: plotytan eller panelens plotyta. */
  yta: Yta;
  /** Där ytan slutar nedåt, axeln inräknad: där står tooltipen i smala diagram (stilguiden 6.8). */
  under: number;
}

/** Interaktionen för en scen. Diagram.tsx anropar den från pekar- och tangenthändelser. */
export interface Interaktiv {
  /** Pekaren står där hovring gäller. */
  inom(px: number, py: number): boolean;
  /** Ny aktiv punkt vid pekaren. `nu` ger trögheten, `pekskarm` den större lyftradien. */
  pekare(px: number, py: number, nu: AktivPunkt | null, pekskarm: boolean): AktivPunkt | null;
  /** Aktiv punkt när pekaren står på en etikett eller ett panelnamn. */
  etikett(serieId: string): AktivPunkt | null;
  /** Läget när diagrammet får tangentbordsfokus. */
  start(): AktivPunkt | null;
  tangent(nyckel: string, aktiv: AktivPunkt | null): Tangentutfall;
  /** Om den aktiva punkten finns i scenen (scenen kan ha ritats om). */
  giltig(aktiv: AktivPunkt): boolean;
  tooltip(aktiv: AktivPunkt, satt: Inmatning): TooltipLage | null;
  /**
   * Enheten som ett klick på den aktiva punkten gör till fokus, annars null
   * (tillägg i WP10). Bara rader i enheternas rangordning när figuren kan borra
   * ned; panelerna borrar via namnet (data-panelnamn) och saknar den.
   */
  borra?(aktiv: AktivPunkt): string | null;
}

export interface InteraktionVal {
  /** Figuren kan borra ned (onFokus finns): Enter och klick på panelnamnet byter fokus. */
  nedborrning?: boolean;
}

/** En graftyps interaktion. Byggs när scenen ändras, aldrig vid hovring. */
export type Interaktion = (scen: Scen, spec: ChartSpec, val?: InteraktionVal) => Interaktiv;

// ── Tid: linje och stapel ──

/** Tooltipens innehåll för en period i ett tidsdiagram. Förval: tooltipModell (linje). */
export type TidsTooltip = (spec: ChartSpec, axel: Tidsaxel, pi: PunktIndex, aktiv: AktivPunkt, satt: Inmatning) => TooltipModell;

/** Linjens och stapelns interaktion: reglerna överst i filen. */
export function tidsinteraktion(innehall: TidsTooltip = tooltipModell): Interaktion {
  return (scen, spec) => {
    const m = byggTraffmodell(scen, spec);
    const axel = tidsaxel(spec);
    const pi = byggPunktIndex(spec, axel);
    const xVid = (index: number) => m.perioder.find((p) => p.index === index)?.x;
    return {
      inom: (px, py) => iPlotytan(m, px, py),
      pekare: (px, py, nu, pekskarm) => pekarlage(m, px, py, nu, pekskarm ? PEKSKARMSREGLER : STANDARDREGLER),
      etikett: (serieId) => {
        // Etiketten lyfter serien vid dess sista värde (linjeslutet)
        const index = m.stoppPerSerie.get(serieId)?.at(-1)?.index ?? m.perioder.at(-1)?.index;
        return index === undefined ? null : { index, serieId };
      },
      start: () => startlage(m, spec),
      tangent: (nyckel, aktiv) => tangent(nyckel, m, spec, aktiv),
      giltig: (aktiv) => xVid(aktiv.index) !== undefined,
      tooltip: (aktiv, satt) => {
        const x = xVid(aktiv.index);
        return x === undefined ? null : { modell: innehall(spec, axel, pi, aktiv, satt), x, yta: scen.plot, under: scen.hojd };
      },
    };
  };
}

// ── Rader: rangordning ──

/** Rangordningens rader: pekarmålen uppifrån (index = raden) och halva radhöjden. */
export interface Radmodell {
  rader: Stopp[];
  halv: number;
  bredd: number;
}

export function byggRadmodell(scen: Scen): Radmodell {
  const rader = [...scen.stopp].sort((a, b) => a.index - b.index);
  const halv = rader.length > 1 ? (rader[1].y - rader[0].y) / 2 : scen.plot.h / 2;
  return { rader, halv, bredd: scen.bredd };
}

/**
 * Träffregeln för rader (stilguiden 6.8, rangordning): raden under pekaren är
 * den närmaste i höjdled. Hela raden räknas, från namnet till högerkanten, och
 * halva radavståndet åt vardera hållet, så att det inte finns någon lucka
 * mellan raderna. Raderna ligger tätt; ingen tröghet behövs.
 */
export function radVid(m: Radmodell, px: number, py: number): number | null {
  if (!m.rader.length || px < 0 || px > m.bredd) return null;
  const forsta = m.rader[0], sista = m.rader[m.rader.length - 1];
  if (py < forsta.y - m.halv || py > sista.y + m.halv) return null;
  let bast = forsta, avstand = Infinity;
  for (const r of m.rader) {
    const d = Math.abs(r.y - py);
    if (d < avstand) { avstand = d; bast = r; }
  }
  return bast.index;
}

function radAktiv(m: Radmodell, index: number): AktivPunkt | null {
  const r = m.rader.find((x) => x.index === index);
  return r ? { index: r.index, serieId: r.serieId } : null;
}

/** Startraden när rangordningen får fokus: Halland (fokus) om den finns, annars första raden. */
export function radStart(m: Radmodell, spec: ChartSpec): AktivPunkt | null {
  const fokus = spec.serier.find((s) => s.roll === "fokus");
  const r = m.rader.find((x) => x.serieId === fokus?.id) ?? m.rader[0];
  return r ? { index: r.index, serieId: r.serieId } : null;
}

/**
 * Enheten en rad borrar ned till: radens enhet när raderna i specen är enheter
 * som kan bli fokus (spec.borrbar, enheternas rangordning), annars null.
 */
export function radEnhet(spec: ChartSpec, serieId: string | null): string | null {
  if (!spec.borrbar || !serieId) return null;
  const s = spec.serier.find((x) => x.id === serieId);
  return s && (s.roll === "fokus" || s.roll === "kontext" || s.roll === "markerad") ? s.enhetId ?? s.id : null;
}

/**
 * Tangentbordet i rangordningen: ↑ ↓ mellan rader, Home/End, Enter fäster
 * (eller borrar ned i raden när figuren kan och raderna är enheter), Escape stänger.
 */
export function radTangent(nyckel: string, m: Radmodell, spec: ChartSpec, aktiv: AktivPunkt | null, nedborrning = false): Tangentutfall {
  const start = aktiv ?? radStart(m, spec);
  if (!start) return { hanterad: false, aktiv };
  const pos = Math.max(0, m.rader.findIndex((r) => r.index === start.index));
  const till = (i: number): Tangentutfall =>
    ({ hanterad: true, aktiv: radAktiv(m, m.rader[Math.max(0, Math.min(m.rader.length - 1, i))].index) });
  switch (nyckel) {
    case "ArrowDown": return till(pos + 1);
    case "ArrowUp": return till(pos - 1);
    case "Home": return till(0);
    case "End": return till(m.rader.length - 1);
    case "Enter": {
      const enhet = nedborrning ? radEnhet(spec, start.serieId) : null;
      if (enhet) return { hanterad: true, aktiv: start, fokus: enhet };
      const s = start.serieId ? spec.serier.find((x) => x.id === start.serieId) : undefined;
      if (s && arFastbar(s)) return { hanterad: true, aktiv: start, vaxla: s.id };
      return { hanterad: aktiv !== null, aktiv: start };
    }
    case "Escape":
      return { hanterad: aktiv !== null, aktiv: null };
    default:
      return { hanterad: false, aktiv };
  }
}

/** Tooltipens innehåll för en rad. `nedborrning`: klick på raden borrar ned (tillägg i WP10). */
export type RadTooltip = (spec: ChartSpec, rad: Stopp, satt: Inmatning, nedborrning: boolean) => TooltipModell;

/** Rangordningens interaktion: träffregeln för rader och radernas tangentbord. */
export function radinteraktion(innehall: RadTooltip): Interaktion {
  return (scen, spec, val) => {
    const m = byggRadmodell(scen);
    const ned = !!val?.nedborrning && !!spec.borrbar;
    return {
      inom: (px, py) => radVid(m, px, py) !== null,
      pekare: (px, py) => {
        const i = radVid(m, px, py);
        return i === null ? null : radAktiv(m, i);
      },
      etikett: (serieId) => {
        const r = m.rader.find((x) => x.serieId === serieId);
        return r ? radAktiv(m, r.index) : null;
      },
      start: () => radStart(m, spec),
      tangent: (nyckel, aktiv) => radTangent(nyckel, m, spec, aktiv, ned),
      giltig: (aktiv) => m.rader.some((r) => r.index === aktiv.index && r.serieId === aktiv.serieId),
      tooltip: (aktiv, satt) => {
        const r = m.rader.find((x) => x.index === aktiv.index);
        return r ? { modell: innehall(spec, r, satt, ned), x: r.x, y: r.y, yta: scen.plot, under: scen.hojd } : null;
      },
      borra: (aktiv) => (ned ? radEnhet(spec, aktiv.serieId) : null),
    };
  };
}

// ── Paneler: små multiplar ──

/** Panelerna, de gemensamma perioderna och luften mellan panelerna. */
export interface Panelmodell {
  paneler: ScenPanel[];
  /** Perioder med värde i någon panel, i ordning, med x räknat från panelens plotyta. */
  perioder: { index: number; dx: number }[];
  /** Halva luften mellan panelerna i sidled och höjdled. */
  luft: { x: number; y: number };
}

export function byggPanelmodell(scen: Scen): Panelmodell {
  const paneler = scen.paneler ?? [];
  const dx = new Map<number, number>();
  for (const p of paneler) for (const s of p.stopp) if (!dx.has(s.index)) dx.set(s.index, s.x - p.plot.x);
  const perioder = [...dx].map(([index, d]) => ({ index, dx: d })).sort((a, b) => a.index - b.index);
  // Luften mellan två grannar: minsta positiva avstånd i varje led
  let lx = Infinity, ly = Infinity;
  for (const a of paneler) for (const b of paneler) {
    if (b.x > a.x + a.b && Math.abs(b.y - a.y) < 1) lx = Math.min(lx, b.x - (a.x + a.b));
    if (b.y > a.y + a.h && Math.abs(b.x - a.x) < 1) ly = Math.min(ly, b.y - (a.y + a.h));
  }
  return { paneler, perioder, luft: { x: Number.isFinite(lx) ? lx / 2 : 0, y: Number.isFinite(ly) ? ly / 2 : 0 } };
}

/** Panelen under pekaren. Luften mellan panelerna delas mitt itu, så att tooltipen inte blinkar mellan dem. */
export function panelVid(m: Panelmodell, px: number, py: number): ScenPanel | null {
  return m.paneler.find((p) =>
    px >= p.x - m.luft.x && px <= p.x + p.b + m.luft.x && py >= p.y - m.luft.y && py <= p.y + p.h + m.luft.y) ?? null;
}

/** Närmaste period till pekarens x i panelen; samma period gäller i alla paneler (synkroniserad hjälplinje). */
export function panelPeriod(m: Panelmodell, p: ScenPanel, px: number): number | null {
  let bast: number | null = null, avstand = Infinity;
  for (const q of m.perioder) {
    const d = Math.abs(p.plot.x + q.dx - px);
    if (d < avstand) { avstand = d; bast = q.index; }
  }
  return bast;
}

/** Panelens sista period med värde, annars sista perioden. */
function panelSista(m: Panelmodell, p: ScenPanel): number | undefined {
  return p.stopp.filter((s) => s.serieId === p.serieId).at(-1)?.index ?? m.perioder.at(-1)?.index;
}

/** Startläget när små multiplar får fokus: första (bästa) panelen, dess senaste värde. */
export function panelStart(m: Panelmodell): AktivPunkt | null {
  const p = m.paneler[0];
  const index = p ? panelSista(m, p) : undefined;
  return p && index !== undefined ? { index, serieId: p.serieId } : null;
}

/**
 * Tangentbordet i små multiplar: ← → mellan perioder (i alla paneler samtidigt),
 * Home/End, ↑ ↓ mellan paneler i visningsordning, Enter borrar ned i panelen
 * (när figuren kan det), Escape stänger.
 */
export function panelTangent(nyckel: string, m: Panelmodell, aktiv: AktivPunkt | null, nedborrning: boolean): Tangentutfall {
  const start = aktiv ?? panelStart(m);
  if (!start) return { hanterad: false, aktiv };
  const perioder = m.perioder.map((p) => p.index);
  const pos = Math.max(0, perioder.indexOf(start.index));
  const panel = Math.max(0, m.paneler.findIndex((p) => p.serieId === start.serieId));
  switch (nyckel) {
    case "ArrowRight":
    case "ArrowLeft": {
      const ny = Math.max(0, Math.min(perioder.length - 1, pos + (nyckel === "ArrowRight" ? 1 : -1)));
      return { hanterad: true, aktiv: { index: perioder[ny], serieId: start.serieId } };
    }
    case "Home":
    case "End":
      return { hanterad: true, aktiv: { index: nyckel === "Home" ? perioder[0] : perioder[perioder.length - 1], serieId: start.serieId } };
    case "ArrowDown":
    case "ArrowUp": {
      const ny = Math.max(0, Math.min(m.paneler.length - 1, panel + (nyckel === "ArrowDown" ? 1 : -1)));
      return { hanterad: true, aktiv: { index: start.index, serieId: m.paneler[ny].serieId } };
    }
    case "Enter": {
      const p = m.paneler[panel];
      if (nedborrning && p) return { hanterad: true, aktiv: start, fokus: p.enhetId };
      return { hanterad: aktiv !== null, aktiv: start };
    }
    case "Escape":
      return { hanterad: aktiv !== null, aktiv: null };
    default:
      return { hanterad: false, aktiv };
  }
}

/** Tooltipens innehåll i en panel vid en period. */
export type PanelTooltip = (spec: ChartSpec, panel: ScenPanel, index: number, satt: Inmatning, nedborrning: boolean) => TooltipModell;

/** Små multiplars interaktion: synkroniserad period, tooltip i panelen under pekaren. */
export function panelinteraktion(innehall: PanelTooltip): Interaktion {
  return (scen, spec, val) => {
    const m = byggPanelmodell(scen);
    const ned = !!val?.nedborrning;
    const panel = (serieId: string | null) => m.paneler.find((p) => p.serieId === serieId);
    return {
      inom: (px, py) => panelVid(m, px, py) !== null,
      pekare: (px, py) => {
        const p = panelVid(m, px, py);
        const index = p ? panelPeriod(m, p, px) : null;
        return p && index !== null ? { index, serieId: p.serieId } : null;
      },
      etikett: (serieId) => {
        const p = panel(serieId);
        const index = p ? panelSista(m, p) : undefined;
        return p && index !== undefined ? { index, serieId: p.serieId } : null;
      },
      start: () => panelStart(m),
      tangent: (nyckel, aktiv) => panelTangent(nyckel, m, aktiv, ned),
      giltig: (aktiv) => !!panel(aktiv.serieId) && m.perioder.some((p) => p.index === aktiv.index),
      tooltip: (aktiv, satt) => {
        const p = panel(aktiv.serieId);
        const dx = m.perioder.find((q) => q.index === aktiv.index)?.dx;
        if (!p || dx === undefined) return null;
        return { modell: innehall(spec, p, aktiv.index, satt, ned), x: p.plot.x + dx, yta: p.plot, under: p.y + p.h };
      },
    };
  };
}
