// charts/typer/rangordning.tsx: renderare för diagramtypen "rangordning"
// (stilguiden 6.5, 6.6 och 6.8). Ägare: WP3.
//
// Punktdiagram med en rad per region (eller enhet) i specens ordning, bäst
// överst. Varje rad: namnet högerställt i en kolumn till vänster (typ.roll.not)
// och en punkt vid värdet. Övriga regioner r 4,5 i diagram.kontextPunkt; fokus
// r 5,5 i diagram.fokus med namn och värde i 600; fästa regioner i sina
// markeringsfärger med namn och värde i 600. Riket (eller överordnad nivå) är
// en lodrät streckad linje med etikett och värde ovanför plotytan. Topp 3
// avgränsas med en grans-linje under tredje raden och texten "topp 3" vid
// högerkanten (12 px). Lodrätt streckat rutnät på värdeaxelns jämna värden,
// tickvärden under plotytan, inga ytor. Rader utan värde finns inte i specen.
//
// Interaktion (karna/interaktion.ts, rader): raden under pekaren lyfts med en
// vågrät hjälplinje, namnet och värdet i 600, och tooltipen visar namn, värde,
// plats av antal och skillnaden mot riket. Klick på raden fäster eller tar
// bort regionen (samma fästa som i linjevyn), ↑ ↓ flyttar mellan rader och
// Enter fäster. Tillägg i WP10: i enheternas rangordning (spec.borrbar) borrar
// klick och Enter ned i raden när figuren kan, och uppmaningen säger det.

import { plats, varde } from "../../design/format";
import { tema, type Tema } from "../../design/tema";
import { arFastbar } from "../karna/fasta";
import { GEOMETRI } from "../karna/geometri";
import { radEnhet, radinteraktion } from "../karna/interaktion";
import { kortaText, textbredd } from "../karna/matt";
import { skarp } from "../karna/ritstil";
import { linjarSkala, tickText, vardeTicks } from "../karna/skalor";
import { liveText, skillnadText, uppmaningVerb } from "../karna/tooltipDelar";
import { serieFarg, type Inmatning, type TooltipModell, type TooltipRad } from "../karna/tooltipModell";
import type { Form, Lager, LagerId, Renderare, Scen, Stopp } from "../register";
import type { ChartSpec, SpecSerie } from "../spec";
import { RitaRangordning } from "./rangordningRita";

type RadSerie = SpecSerie & { varde: number };

const RADROLLER = new Set<SpecSerie["roll"]>(["fokus", "kontext", "markerad"]);
const harVarde = (s: SpecSerie): s is RadSerie => s.varde !== undefined && Number.isFinite(s.varde);

/** Raderna i specens ordning (bäst först): fokus, övriga och fästa med värde. */
export function rangRader(spec: ChartSpec): RadSerie[] {
  return spec.serier.filter((s): s is RadSerie => RADROLLER.has(s.roll) && harVarde(s));
}

/** Referensen: riket, eller överordnad nivå när enheter rangordnas. */
const referensSerie = (spec: ChartSpec): RadSerie | undefined =>
  spec.serier.find((s): s is RadSerie => s.roll === "referens" && harVarde(s));

/** Topp 3-gränsen: `varde` = antal rader ovanför linjen. */
const gransSerie = (spec: ChartSpec): RadSerie | undefined =>
  spec.serier.find((s): s is RadSerie => s.roll === "grans" && harVarde(s));

/** Etikettens text för en serie: specens etikett, annars namnet. */
const etikettText = (spec: ChartSpec, s: SpecSerie) => spec.etiketter.find((e) => e.serieId === s.id)?.text || s.namn;

/** Radhöjd: 24 px, 22 px i smala diagram (stilguiden 6.5). */
export function radhojd(bredd: number, t: Tema = tema): number {
  return bredd < GEOMETRI.smal ? t.diagram.hojd.rangordning.radMobil : t.diagram.hojd.rangordning.rad;
}

/** Luft ovanför första raden: plats för referensens etikett. */
const toppluft = (spec: ChartSpec, t: Tema) => (referensSerie(spec) ? t.rum[5] : t.rum[3]);

function hojd(bredd: number, spec: ChartSpec): number {
  return toppluft(spec, tema) + Math.max(1, rangRader(spec).length) * radhojd(bredd) + GEOMETRI.axelrad;
}

/** Punktens radie per roll (stilguiden 6.6). */
function radie(s: SpecSerie, t: Tema): number {
  return s.roll === "fokus" ? t.diagram.rangordning.fokusPunktradie : t.diagram.rangordning.punktradie;
}

/** Punktens färg i vila: övriga i kontextPunkt, fokus grön, fästa i sin markeringsfärg. */
function punktFarg(s: SpecSerie, t: Tema): string {
  const r = t.diagram.roll;
  if (s.roll === "fokus") return r.fokus.farg;
  if (s.roll === "markerad") return r.markerad.farg[(s.markeringIndex ?? 0) % r.markerad.farg.length];
  return t.farg.diagram.kontextPunkt;
}

/** Namnets och värdets färg: fokus farg.fokus, fästa sin färg, övriga farg.text2. */
function textFarg(s: SpecSerie, t: Tema): string {
  if (s.roll === "fokus") return t.farg.fokus;
  if (s.roll === "markerad") return punktFarg(s, t);
  return t.farg.text2;
}

/** Tickvärden som krockar glesas ut till vartannat (vart tredje …) tills de får plats. */
function glesa(ticks: Scen["xTicks"]): Scen["xTicks"] {
  const krockar = (l: Scen["xTicks"]) => l.some((tk, i) => i > 0
    && l[i - 1].x + textbredd(l[i - 1].text) / 2 + GEOMETRI.xEtikettLuft > tk.x - textbredd(tk.text) / 2);
  for (let k = 1; k < ticks.length; k++) {
    const val = ticks.filter((_, i) => i % k === 0);
    if (!krockar(val)) return val;
  }
  return ticks.slice(0, 1);
}

const TOPP3 = "topp 3";

function layout(spec: ChartSpec, storlek: { bredd: number; hojd: number }, t: Tema): Scen {
  const { bredd, hojd: h } = storlek;
  const rader = rangRader(spec);
  const ref = referensSerie(spec);
  const grans = gransSerie(spec);
  const f = spec.x.format;
  const smal = bredd < GEOMETRI.smal;
  const rad = radhojd(bredd, t);
  const not = t.typ.roll.not;

  // Namnkolumnen: bredaste namnet i 600 (en lyft rad skrivs i 600), högst namnMaxAndel
  const namnB = Math.min(
    Math.floor(bredd * t.diagram.rangordning.namnMaxAndel),
    Math.ceil(Math.max(0, ...rader.map((s) => textbredd(s.namn, not.viktStark)))),
  );
  const plotX = namnB + t.rum[3];
  // Värdekolumnen till höger: punktens radie, luft och bredaste värdet i 600 (eller "topp 3")
  const vardeB = Math.ceil(Math.max(
    grans ? textbredd(TOPP3, not.vikt, t.typ.minsta) : 0,
    ...rader.map((s) => textbredd(varde(s.varde, f), not.viktStark)),
  ));
  const hoger = t.diagram.rangordning.fokusPunktradie + t.rum[2] + vardeB + t.rum[1];
  const topp = toppluft(spec, t);
  const plot = { x: plotX, y: topp, b: Math.max(1, bredd - plotX - hoger), h: Math.max(0, h - topp - GEOMETRI.axelrad) };

  // Värdeskalan omsluter raderna och referensen (stilguiden 6.3)
  const alla = [...rader.map((s) => s.varde), ...(ref ? [ref.varde] : [])];
  const vt = vardeTicks(Math.min(...alla), Math.max(...alla), smal, spec.x.noll);
  const xs = linjarSkala([vt.ticks[0], vt.ticks[vt.ticks.length - 1]], plot.x, plot.x + plot.b);
  const xTicks = glesa(vt.ticks.map((v) => ({ v, x: xs(v), text: tickText(v, f, vt.decimaler) })));

  const lager = new Map<LagerId, Lager>();
  const lagg = (id: LagerId, form: Form, serieId?: string) => {
    let l = lager.get(id);
    if (!l) { l = { id, serieIds: [], former: [] }; lager.set(id, l); }
    l.former.push(form);
    if (serieId && !l.serieIds.includes(serieId)) l.serieIds.push(serieId);
  };
  const yRad = (i: number) => plot.y + rad * (i + 0.5);
  const textY = (y: number) => y + GEOMETRI.textMitt;

  // Topp 3: en heldragen linje under tredje raden, över namn och plotyta, och texten vid högerkanten
  if (grans && grans.varde > 0 && grans.varde < rader.length) {
    const yg = skarp(plot.y + rad * grans.varde);
    const text = etikettText(spec, grans) || TOPP3;
    const tb = textbredd(text, not.vikt, t.typ.minsta);
    const g = t.diagram.roll.grans;
    lagg("axel", { typ: "streck", x1: 0, y1: yg, x2: Math.max(0, bredd - t.rum[1] - tb - t.rum[2]), y2: yg, farg: g.farg, bredd: g.bredd, streck: g.streck }, grans.id);
    lagg("axel", { typ: "text", serieId: grans.id, x: bredd - t.rum[1], y: yg + t.typ.minsta * 0.35, text, farg: t.farg.text3, vikt: not.vikt, storlek: t.typ.minsta, ankare: "end", halo: false }, grans.id);
  }

  // Riket: lodrät streckad linje genom raderna, etikett med värde ovanför
  if (ref) {
    const r = t.diagram.roll.referens;
    const xr = skarp(xs(ref.varde));
    lagg("referens", { typ: "streck", x1: xr, y1: plot.y - t.rum[1], x2: xr, y2: plot.y + plot.h, farg: r.farg, bredd: r.bredd, streck: r.streck }, ref.id);
    const text = `${etikettText(spec, ref)} ${varde(ref.varde, f)}`;
    const tb = textbredd(text);
    const cx = Math.max(tb / 2, Math.min(bredd - tb / 2, xs(ref.varde)));
    lagg("referens", { typ: "text", serieId: ref.id, x: cx, y: plot.y - t.rum[2], text, farg: r.farg, vikt: not.vikt, storlek: not.storlek, ankare: "middle", halo: true }, ref.id);
  }

  // Raderna, ovanpå riket: övriga först, sedan fästa och fokus överst
  const stopp: Stopp[] = [];
  const ordning: SpecSerie["roll"][] = ["kontext", "markerad", "fokus"];
  const radForm: Form[][] = ordning.map(() => []);
  rader.forEach((s, i) => {
    const y = yRad(i), x = xs(s.varde);
    const stark = s.roll !== "kontext";
    const vikt = stark ? not.viktStark : not.vikt;
    const former = radForm[ordning.indexOf(s.roll)];
    former.push({ typ: "punkt", serieId: s.id, x, y, r: radie(s, t), farg: punktFarg(s, t) });
    former.push({
      typ: "text", serieId: s.id, x: plot.x - t.rum[3], y: textY(y), text: kortaText(s.namn, namnB, vikt),
      farg: textFarg(s, t), vikt, storlek: not.storlek, ankare: "end", halo: false,
    });
    if (stark) {
      former.push({
        typ: "text", serieId: s.id, x: x + radie(s, t) + t.rum[2], y: textY(y), text: varde(s.varde, f),
        farg: textFarg(s, t), vikt: not.viktStark, storlek: not.storlek, ankare: "start", halo: true,
      });
    }
    stopp.push({ serieId: s.id, index: i, x, y, varde: s.varde });
  });
  radForm.flat().forEach((form) => lagg("punkter", form, "serieId" in form ? form.serieId : undefined));

  return {
    bredd, hojd: h, plot, xTicks, yTicks: [],
    lager: [...lager.values()],
    etiketter: [],
    stopp,
  };
}

// ── Tooltip ──

/** "riket" i diagramtext efter "mot"; andra namn som de står. */
const motNamn = (namn: string) => (namn === "Riket" ? "riket" : namn);

/**
 * Tooltipen för en rad (stilguiden 6.8): perioden som rubrik, raden med värde
 * och plats av antal (i 600), riket och skillnaden mot riket. Sist
 * uppmaningen att markera eller ta bort när regionen kan fästas, eller att
 * visa enheten när raden borrar ned (`nedborrning`, enheternas rangordning).
 */
export function radTooltip(spec: ChartSpec, rad: Stopp, satt: Inmatning, nedborrning = false): TooltipModell {
  const s = spec.serier.find((x) => x.id === rad.serieId);
  const f = spec.x.format;
  const rubrik = spec.period?.text ?? "";
  const rader: TooltipRad[] = [];
  if (s) {
    const n = spec.platsAv?.[0];
    rader.push({
      serieId: s.id, namn: s.namn, varde: varde(rad.varde, f),
      plats: s.plats !== undefined && n !== undefined ? plats(s.plats, n) : null, farg: serieFarg(s), fet: true,
    });
  }
  const ref = referensSerie(spec);
  if (ref && s) {
    const namn = etikettText(spec, ref);
    rader.push({ serieId: ref.id, namn, varde: varde(ref.varde, f), plats: null, farg: serieFarg(ref), fet: false });
    rader.push({ serieId: null, namn: `Skillnad mot ${motNamn(namn)}`, varde: skillnadText(rad.varde - ref.varde, f), plats: null, farg: null, fet: false });
  }
  let uppmaning: string | null = null;
  if (s && nedborrning && radEnhet(spec, s.id)) {
    uppmaning = `${uppmaningVerb(satt)} för att visa ${s.namn}`;
  } else if (s && arFastbar(s)) {
    uppmaning = s.roll === "markerad"
      ? `${uppmaningVerb(satt)} för att ta bort`
      : `${uppmaningVerb(satt)} för att markera ${s.namn}`;
  }
  return { rubrik, nyMetod: false, rader, noter: [], uppmaning, live: liveText(rubrik, rader, [], uppmaning) };
}

export const rangordning: Renderare = {
  typ: "rangordning",
  minstaBredd: 240,
  hojd,
  layout,
  Rita: RitaRangordning,
  interaktion: radinteraktion(radTooltip),
};
