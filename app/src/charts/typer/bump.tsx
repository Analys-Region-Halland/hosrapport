// charts/typer/bump.tsx: renderare för diagramtypen "bump", rangordningen
// över tid (tillägg 2026-10-08). Ersätter punktdiagrammet i visningen
// Rangordning när indikatorn har plats för minst två perioder.
//
// Uppbyggnad (god praxis för bumpdiagram: Datawrapper, Flourish, FT):
//   - Plats 1 överst, en rad per plats, åren på x-axeln.
//   - Varje region är en linje med S-kurvor mellan åren (curveBumpX), så att
//     korsningarna går att följa. Övriga regioner som tunna grå linjer med en
//     liten punkt per år; Halland grön och kraftig med platsen skriven i en
//     cirkel varje år; fästa regioner i sina markeringsfärger med platsen i
//     mindre cirklar. Halland ritas sist, överst.
//   - Namnen står direkt vid linjeslutet (ingen legend), varje region i
//     höjd med sin sista plats. Plats 1–N står till vänster.
//   - Topp 3 avgränsas med en streckad linje mellan plats 3 och 4.
//   - År utan värde bryter linjen; ingen plats hittas på. Lika värden delar
//     plats (1, 2, 2, 4); raderna sorteras då efter namn så att linjerna inte
//     ligger ovanpå varandra, men cirkeln och tooltipen visar den delade platsen.
// Hovring, tangentbord, tooltip och fästa regioner är linjediagrammets
// (karna/interaktion.ts, Overlagg.tsx); överlägget ritar lyft linje med samma
// kurvform (Scen.kurva).

import { curveBumpX, line } from "d3";
import type { Tema } from "../../design/tema";
import { arFastbar } from "../karna/fasta";
import { GEOMETRI } from "../karna/geometri";
import { tidsinteraktion } from "../karna/interaktion";
import { kortaText, textbredd } from "../karna/matt";
import { tidsaxel, tidsskala, tidsTicks } from "../karna/skalor";
import type { Etikett, Form, Lager, LagerId, Renderare, Scen, Stopp } from "../register";
import type { ChartSpec, SpecSerie } from "../spec";
import { RitaBump } from "./bumpRita";

/** Radhöjd per plats: 26 px desktop, 22 px smalt. */
const RAD = 26;
const RAD_SMAL = 22;
const TOPP = 30;   // plats för etiketten Topp 3 ovanför fältet
const LINJEROLLER = new Set(["fokus", "kontext", "markerad"]);

const antalPlatser = (spec: ChartSpec) =>
  Math.max(1, ...(spec.platsAv ?? []), ...spec.serier.map((s) => s.platser?.filter((p) => p !== null).length ? 1 : 0));

function radhojd(bredd: number) {
  return bredd < GEOMETRI.smal ? RAD_SMAL : RAD;
}

function hojd(bredd: number, spec: ChartSpec): number {
  const n = antalPlatser(spec);
  return TOPP + n * radhojd(bredd) + GEOMETRI.axelrad;
}

function serieFargen(s: SpecSerie, t: Tema): string {
  if (s.roll === "fokus") return t.diagram.roll.fokus.farg;
  if (s.roll === "markerad") return t.diagram.roll.markerad.farg[(s.markeringIndex ?? 0) % t.diagram.roll.markerad.farg.length];
  return t.diagram.roll.kontext.farg;
}

function layout(spec: ChartSpec, storlek: { bredd: number; hojd: number }, t: Tema): Scen {
  const { bredd } = storlek;
  const axel = tidsaxel(spec);
  const n = axel.perioder.length;
  const rad = radhojd(bredd);
  const smal = bredd < GEOMETRI.smal;
  const serier = spec.serier.filter((s) => LINJEROLLER.has(s.roll) && s.platser?.some((p) => p !== null));

  // Perioder där någon region har plats; övriga står kvar på axeln men bryter inget
  const matt = new Set<number>();
  for (const s of serier) s.platser?.forEach((p, i) => { if (p !== null) matt.add(i); });

  // Radposition per period: platsen, lika platser ordnade efter namn
  const position = new Map<string, (number | null)[]>(serier.map((s) => [s.id, Array<number | null>(n).fill(null)]));
  for (let i = 0; i < n; i++) {
    const medPlats = serier
      .filter((s) => s.platser?.[i] != null)
      .sort((a, b) => (a.platser![i]! - b.platser![i]!) || a.namn.localeCompare(b.namn, "sv"));
    medPlats.forEach((s, k) => { (position.get(s.id) as (number | null)[])[i] = k + 1; });
  }
  const N = Math.max(1, ...[...position.values()].flatMap((v) => v.filter((x): x is number => x !== null)));

  // Etiketter: namnet vid sista platsen, kortat så att kolumnen ryms
  const vikt = (s: SpecSerie) => (s.roll === "kontext" ? 400 : t.typ.roll.not.viktStark);
  const maxText = Math.max(60, bredd * t.diagram.etikett.maxMarginalAndel - t.diagram.etikett.kolumnAvstand - GEOMETRI.etikettLuftHoger);
  const texter = new Map(serier.map((s) => [s.id, kortaText(s.namn, maxText, vikt(s))]));
  const langst = Math.max(0, ...serier.map((s) => textbredd(texter.get(s.id) as string, vikt(s))));
  const hoger = Math.ceil(langst + t.diagram.etikett.kolumnAvstand + GEOMETRI.etikettLuftHoger);
  const platsText = (p: number) => String(p);
  const vanster = Math.ceil(textbredd(platsText(N)) + GEOMETRI.yKolumnLuft + (smal ? 4 : 10));

  const plot = { x: vanster, y: TOPP, b: Math.max(1, bredd - vanster - hoger), h: N * rad };
  const xs = tidsskala(n, plot.x + (smal ? 8 : 14), plot.x + plot.b - (smal ? 8 : 14));
  const x = (i: number) => xs(i);
  const yPos = (pos: number) => plot.y + (pos - 0.5) * rad;
  const xTicks = tidsTicks(axel, x).map((tk) => ({ v: axel.perioder[tk.index], x: tk.x, text: tk.text }));
  const yTicks = Array.from({ length: N }, (_, k) => ({ v: k + 1, y: yPos(k + 1), text: platsText(k + 1) }));

  const lager = new Map<LagerId, Lager>();
  const lagg = (id: LagerId, f: Form, serieId?: string) => {
    let l = lager.get(id);
    if (!l) { l = { id, serieIds: [], former: [] }; lager.set(id, l); }
    l.former.push(f);
    if (serieId && !l.serieIds.includes(serieId)) l.serieIds.push(serieId);
  };

  // Topp 3 (målet): ett mjukt grönt fält bakom plats 1–3, från platssiffrorna till
  // plotytans högerkant, med en grön kant till vänster och etiketten ovanför
  if (spec.serier.some((s) => s.roll === "grans") && N > 3) {
    const b = t.diagram.bump;
    lagg("zon", { typ: "rekt", x: 0, y: plot.y, b: plot.x + plot.b, h: 3 * rad, farg: b.topp3, radie: 6 });
    lagg("zon", { typ: "rekt", x: 0, y: plot.y, b: 3, h: 3 * rad, farg: t.farg.plats.topp.punkt, radie: 1.5 });
    lagg("zon", { typ: "text", x: 0, y: plot.y - 9, text: "Topp 3 · målet", farg: t.farg.plats.topp.text, vikt: 700, storlek: t.typ.minsta, ankare: "start", halo: false });
  }

  const gen = line<[number, number]>().curve(curveBumpX).x((d) => d[0]).y((d) => d[1]);
  const stopp: Stopp[] = [];
  // Ordning: kontext först, sedan fästa, sist fokus (överst)
  const ordning = [...serier].sort((a, b) => rang(a) - rang(b));
  for (const s of ordning) {
    const pos = position.get(s.id) as (number | null)[];
    const farg = serieFargen(s, t);
    const id: LagerId = s.roll === "fokus" ? "fokus" : s.roll === "markerad" ? "markerad" : "kontext";
    // En bana per sammanhängande del (luckor bryter linjen)
    let del: [number, number][] = [];
    const delar: [number, number][][] = [];
    for (let i = 0; i < n; i++) {
      if (!matt.has(i)) continue;
      const p = pos[i];
      if (p === null) { if (del.length) delar.push(del); del = []; continue; }
      del.push([x(i), yPos(p)]);
    }
    if (del.length) delar.push(del);
    const bredd = s.roll === "fokus" ? 3 : s.roll === "markerad" ? 2.25 : 1.25;
    for (const d of delar) {
      if (d.length > 1) lagg(id, { typ: "linje", serieId: s.id, d: gen(d) ?? "", farg, bredd, streck: null }, s.id);
    }
    const sista = pos.reduce<number>((acc, p, i) => (p !== null && matt.has(i) ? i : acc), -1);
    for (let i = 0; i < n; i++) {
      const p = pos[i];
      if (p === null || !matt.has(i)) continue;
      const plats = s.platser?.[i] as number;
      const cx = x(i), cy = yPos(p);
      // Övriga regioner: bara linjen (punkterna gjorde diagrammet plottrigt)
      if (s.roll !== "kontext") {
        const r = s.roll === "fokus" ? Math.min(10, rad / 2 - 2) : Math.min(8, rad / 2 - 4);
        lagg(id, { typ: "punkt", serieId: s.id, x: cx, y: cy, r, farg, kant: 1.5, ...(s.roll === "fokus" && i === sista ? { puls: true } : {}) }, s.id);
        const tva = plats >= 10;
        lagg("punkter", {
          typ: "text", serieId: s.id, x: cx, y: cy + (s.roll === "fokus" ? (tva ? 3.5 : 4) : 3.5), text: platsText(plats), farg: t.farg.yta,
          vikt: 700, storlek: s.roll === "fokus" ? (tva ? 10.5 : 12) : (tva ? 9 : 10.5), ankare: "middle", halo: false,
        }, s.id);
      }
      stopp.push({ serieId: s.id, index: i, x: cx, y: cy, varde: plats });
    }
  }

  // Namnen vid linjeslutet, i höjd med sista platsen. En region som saknar
  // värde sista perioden får namnet direkt efter sin sista punkt i stället,
  // så att det inte krockar med regionen som har den platsen sista perioden.
  const sistaMatt = Math.max(...[...matt]);
  const xSista = x(sistaMatt);
  const etiketter: Etikett[] = [];
  for (const s of serier) {
    const pos = position.get(s.id) as (number | null)[];
    let sista = -1;
    pos.forEach((p, i) => { if (p !== null && matt.has(i)) sista = i; });
    if (sista < 0) continue;
    const y = yPos(pos[sista] as number);
    const text = texter.get(s.id) as string;
    const farg = s.roll === "kontext" ? t.farg.text2 : serieFargen(s, t);
    const v = vikt(s);
    const r = s.roll === "fokus" ? Math.min(10, rad / 2 - 2) : s.roll === "markerad" ? Math.min(8, rad / 2 - 4) : 2.25;
    const inne = sista < sistaMatt;
    const tb = textbredd(text, v);
    // Ryms inte namnet mellan punkten och sista perioden står det ovanför punkten
    const ovanfor = inne && x(sista) + r + 10 + tb > xSista - 8;
    const ex = ovanfor ? x(sista) - tb / 2 : inne ? x(sista) + r + 10 : xSista + t.diagram.etikett.kolumnAvstand;
    const ey = ovanfor ? y - r - 9 : y;
    const k = GEOMETRI.koppling;
    etiketter.push({
      serieId: s.id, text, rader: [text], helText: s.namn,
      x: ex, y: ey, textbredd: tb,
      ...(ovanfor ? { koppling: false as const } : {}),
      // Inne i plotytan: en kort stump från punkten; i kolumnen: kopplingslinjen från linjeslutet
      ankarX: inne ? ex - t.diagram.etikett.kolumnAvstand + k.knack : x(sista) + k.start + (s.roll === "kontext" ? 0 : r),
      ankarY: y,
      farg, vikt: v, interaktiv: arFastbar(s),
    });
  }

  return { bredd, hojd: storlek.hojd, plot, xTicks, yTicks, lager: [...lager.values()], etiketter, stopp, kurva: "bump" };
}

const rang = (s: SpecSerie) => (s.roll === "fokus" ? 2 : s.roll === "markerad" ? 1 : 0);

export const bump: Renderare = {
  typ: "bump",
  minstaBredd: 280,
  hojd,
  layout,
  Rita: RitaBump,
  interaktion: tidsinteraktion(),
};
