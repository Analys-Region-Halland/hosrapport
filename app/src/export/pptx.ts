// export/pptx.ts: PowerPoint-export av ett kapitel eller hela rapporten,
// byggd på ChartSpec och tema.ts (stilguiden 6.9). Ägare: WP12a.
// Ersätter utils/pptx.ts (fryst, raderas i WP12b).
//
// Modulen laddas först när någon väljer PowerPoint i Exportera-menyn
// (rapport/Ram.tsx gör import("../export/pptx")), så pptxgenjs hamnar i en
// egen bit av bygget.
//
//   innehall.ts   vilka bilder decket har och vad som står på dem (ren funktion)
//   graf.ts       figurens graf ur ChartSpec: nativa diagram och former ovanpå
//   pptxTema.ts   tema.ts i PowerPoints enheter (färger, typsnitt, storlekar)
//   pptx.ts       bildernas layout och filen
//
// Bilden är 10 × 5,625 tum (16:9). Webbens px räknas om med 96 px per tum, så
// bilden motsvarar en sida på 960 px och rollernas storlekar står i samma
// proportion som på webben.

import PptxGenJS from "pptxgenjs";
import { textbredd } from "../charts/karna/matt";
import type { KapitelModell, Status } from "../data/modell";
import { tema, type Rollnamn } from "../design/tema";
import { STATUSORD } from "../rapport/rapportText";
import { grafPlan, minstaHojd, ritaGraf, type Ruta } from "./graf";
import {
  LAGET_KOLUMNER, meningar, planeraDeck, type AvsnittBild, type Bild, type DeckVal, type IndikatorBild, type KallBild, type KapitelListaBild, type LagetBild,
  type TitelBild, type ViktigastBild,
} from "./innehall";
import { FARG, PX_PER_TUM, SPRAK, TYPSNITT, kickerSparr, pt, roll, rum, tum, type TextRoll } from "./pptxTema";

export type { Bild, DeckVal } from "./innehall";

// ════════════════════════════════════════════════════════════
//  Mått (tum)
// ════════════════════════════════════════════════════════════

const B = 10;
const H = 5.625;
/** Sidmarginal: rum.7 (48 px). */
const M = rum(7);
const INNERBREDD = B - 2 * M;
const KICKER_Y = rum(6) + rum(1);
const INNEHALL_Y = 1.3;
const SIDFOT_Y = H - rum(6) - rum(2);
const INNEHALL_SLUT = SIDFOT_Y - rum(3);

/** Indikatorbildens spalter: text till vänster, figuren till höger. */
const VANSTER_B = 3.15;
const HOGER_X = M + VANSTER_B + rum(5);
const HOGER_B = B - M - HOGER_X;

const R = {
  titel: roll("titel"),
  avsnitt: roll("avsnitt"),
  indikator: roll("indikator"),
  ingress: roll("ingress"),
  brod: roll("brod"),
  figurtitel: roll("figurtitel"),
  granssnitt: roll("granssnitt"),
  granssnittStark: roll("granssnitt", true),
  not: roll("not"),
  notStark: roll("not", true),
} as const;

// ════════════════════════════════════════════════════════════
//  Texthjälp
// ════════════════════════════════════════════════════════════

type Run = PptxGenJS.TextProps;

const stil = (r: TextRoll, farg: string, extra: PptxGenJS.TextPropsOptions = {}): PptxGenJS.TextPropsOptions => ({
  fontFace: r.fontFace, fontSize: r.fontSize, bold: r.bold, color: farg,
  lineSpacingMultiple: r.lineSpacingMultiple, margin: [0, 0, 0, 0], valign: "top", lang: SPRAK, ...extra,
});

/**
 * Uppskattat antal rader för en text i en roll och bredd (tum). Mäter med
 * diagrammets mätare, som mäter sans; serif sätts smalare, så där räcker
 * mätningen som den är. Sans får 8 % luft för radbrytning vid ordgräns.
 */
function rader(text: string, rollnamn: Rollnamn, bredd: number, stark = false, px?: number): number {
  const r = tema.typ.roll[rollnamn];
  const vikt = stark && "viktStark" in r ? r.viktStark : r.vikt;
  const b = textbredd(text, vikt, px ?? r.storlek) * (r.familj === "serif" ? 1 : 1.08);
  return Math.max(1, Math.ceil(b / (bredd * PX_PER_TUM)));
}


/** Kicker: typ.roll.not 600, versal, spärr, farg.fokus (stilguiden 2.4). */
function kicker(slide: PptxGenJS.Slide, text: string, y = KICKER_Y): void {
  slide.addText(text.toLocaleUpperCase("sv"), {
    ...stil(R.notStark, FARG.fokus), x: M, y, w: INNERBREDD, h: R.not.radhojd, charSpacing: kickerSparr(R.not.fontSize),
  });
}

/** Bildens rubrik under kickern. Returnerar rubrikens underkant. */
function rubrik(slide: PptxGenJS.Slide, text: Run[], r: TextRoll, rollnamn: Rollnamn, bredd = INNERBREDD): number {
  const y = KICKER_Y + R.not.radhojd + rum(2);
  const ren = text.map((t) => t.text ?? "").join("");
  const h = Math.min(2, rader(ren, rollnamn, bredd, true)) * r.radhojd;
  slide.addText(text, { ...stil(r, FARG.black), x: M, y, w: bredd, h });
  return y + h;
}

const enkel = (text: string): Run[] => [{ text, options: {} }];

/** Sidfotens bredd: innerbredden minus bildnumrets plats. */
const SIDFOT_B = INNERBREDD - 0.6;

/** Sidfotens rader (högst två): en lång källrad bryts, och då börjar sidfoten en rad högre. */
const sidfotRader = (text: string): number => Math.min(2, rader(text, "not", SIDFOT_B));

/** Sidfot: källa eller kapitel till vänster, bildnummer till höger (typ.roll.not, farg.text3). */
function sidfot(slide: PptxGenJS.Slide, text: string): void {
  const extra = (sidfotRader(text) - 1) * R.not.radhojd;
  slide.addText(text, { ...stil(R.not, FARG.text3), x: M, y: SIDFOT_Y - extra, w: SIDFOT_B, h: R.not.radhojd + extra });
  slide.slideNumber = {
    x: B - M - 0.5, y: SIDFOT_Y, w: 0.5, h: R.not.radhojd,
    fontFace: R.not.fontFace, fontSize: R.not.fontSize, color: FARG.text3, align: "right", margin: [0, 0, 0, 0],
  };
}

/** Statusmarkörens bredd i tum (stilguiden 5.1). */
const markorBredd = (status: Status): number =>
  tum(textbredd(STATUSORD[status], 600, R.not.px) * 1.06 + 2 * tema.komponent.statusmarkor.sidoluft);

/** Statusmarkören: piller med statusens text på dess botten (stilguiden 5.1). `hoger` är markörens högerkant. */
function statusMarkor(slide: PptxGenJS.Slide, status: Status, hoger: number, y: number): void {
  const b = markorBredd(status);
  const h = tum(tema.komponent.statusmarkor.hojd);
  const s = FARG.status[status];
  slide.addText(STATUSORD[status], {
    ...stil(R.notStark, s.text), x: hoger - b, y, w: b, h,
    shape: "roundRect", rectRadius: h / 2, fill: { color: s.botten }, align: "center", valign: "middle", lineSpacingMultiple: 1,
  });
}

// ════════════════════════════════════════════════════════════
//  Tabeller (stilguiden 5.8 och 5.9)
// ════════════════════════════════════════════════════════════

/** Tabellcell: hårlinje under, inga lodräta linjer, ingen zebra. */
function cellStil(r: TextRoll, farg: string, extra: PptxGenJS.TableCellProps = {}): PptxGenJS.TableCellProps {
  const ingen = { type: "none" as const };
  return {
    fontFace: r.fontFace, fontSize: r.fontSize, bold: r.bold, color: farg, valign: "middle", lang: SPRAK,
    margin: [0.02, 0.06, 0.02, 0.02],
    border: [ingen, ingen, { type: "solid", pt: tema.matt.harlinje * 0.75, color: FARG.harlinje }, ingen],
    ...extra,
  };
}

const cell = (text: string, r: TextRoll, farg: string, extra: PptxGenJS.TableCellProps = {}): PptxGenJS.TableCell =>
  ({ text, options: cellStil(r, farg, extra) });

/** Statusens kolumn: statusen i ord på statusens botten, eller "beskrivande mått". */
const statusCell = (status: Status | null): PptxGenJS.TableCell => (status
  ? cell(STATUSORD[status], R.notStark, FARG.status[status].text, { fill: { color: FARG.status[status].botten }, align: "center" })
  : cell("beskrivande mått", R.not, FARG.text3, { margin: [0.02, 0.06, 0.02, 0.1] }));

// ════════════════════════════════════════════════════════════
//  Bilderna
// ════════════════════════════════════════════════════════════

type Lankar = Map<string, number>;
const lank = (lankar: Lankar, mal: string): { hyperlink: PptxGenJS.HyperlinkProps } | Record<string, never> => {
  const n = lankar.get(mal);
  return n ? { hyperlink: { slide: n } } : {};
};

/** Metaradens delar avskilda med " · " (stilguiden 4.3). */
const metaRuns = (delar: string[]): Run[] =>
  delar.flatMap((d, i) => [...(i > 0 ? [{ text: "  ·  ", options: {} }] : []), { text: d, options: {} }]);

function titelBild(slide: PptxGenJS.Slide, b: TitelBild): void {
  // Brandlisten: farg.fokus som yta med texten i vitt (stilguiden 4.1)
  const list = tum(48);
  slide.addShape("rect", { x: 0, y: 0, w: B, h: list, fill: { color: FARG.fokus }, line: { type: "none" } });
  slide.addText([
    { text: "Region Halland", options: { bold: true } },
    { text: "  ·  HoS-rapport", options: { bold: false } },
  ], { ...stil(R.granssnitt, FARG.yta), x: M, y: 0, w: INNERBREDD, h: list, valign: "middle" });

  let y = 1.25;
  kicker(slide, b.kicker, y);
  y += R.not.radhojd + rum(3);
  const tH = Math.min(3, rader(b.titel, "titel", INNERBREDD)) * R.titel.radhojd;
  slide.addText(b.titel, { ...stil(R.titel, FARG.black), x: M, y, w: INNERBREDD, h: tH });
  y += tH + rum(5);
  // Den enda linjen i läsflödet: 2 px farg.fokus under titeln (stilguiden 4.3)
  const linje = tum(tema.komponent.kapitellinje);
  slide.addShape("rect", { x: M, y, w: INNERBREDD, h: linje, fill: { color: FARG.fokus }, line: { type: "none" } });
  y += linje + rum(5);
  if (b.dek) {
    const dB = INNERBREDD * 0.82;
    const dH = Math.min(3, rader(b.dek, "ingress", dB)) * R.ingress.radhojd;
    slide.addText(b.dek, { ...stil(R.ingress, FARG.text2), x: M, y, w: dB, h: dH });
    y += dH + rum(4);
  }
  slide.addText(metaRuns(b.metarad), { ...stil(R.not, FARG.text3), x: M, y, w: INNERBREDD, h: R.not.radhojd * 2 });
  if (b.notis) slide.addText(b.notis, { ...stil(R.not, FARG.text3), x: M, y: SIDFOT_Y, w: INNERBREDD, h: R.not.radhojd });
}

/**
 * Brödtextens storlek och radavstånd så att texten ryms i höjden: först
 * rollens (typ.roll.brod), sedan tätare rader och till sist mindre text, aldrig
 * mindre än typ.roll.granssnitt. Bilder har mindre plats än sidan.
 */
function passaBrod(stycken: string[], bredd: number, hojd: number, styckeluft: number): { fontSize: number; lineSpacingMultiple: number } {
  const brod = tema.typ.roll.brod;
  const minsta = tema.typ.roll.granssnitt.storlek;
  for (let px = brod.storlek; px >= minsta; px--) {
    for (const radhojd of [brod.radhojd, 1.45, 1.3]) {
      const h = stycken.reduce((s, t) => s + rader(t, "brod", bredd, false, px) * tum(px * radhojd), 0) + styckeluft * (stycken.length - 1);
      if (h <= hojd) return { fontSize: pt(px), lineSpacingMultiple: Math.round((radhojd / 1.2) * 100) / 100 };
    }
  }
  return { fontSize: pt(minsta), lineSpacingMultiple: Math.round((1.3 / 1.2) * 100) / 100 };
}

function viktigastBild(slide: PptxGenJS.Slide, b: ViktigastBild, lankar: Lankar): void {
  kicker(slide, b.kicker);
  const y = rubrik(slide, enkel("Det viktigaste"), R.avsnitt, "avsnitt") + rum(5);
  const bredd = INNERBREDD * 0.92;
  const luft = rum(3);
  // En mening per punkt i typ.roll.brod, sist en länk till indikatorn (stilguiden 3.4)
  const passa = passaBrod(b.punkter.map((p) => (p.se ? `${p.text} ${p.se.text}` : p.text)), bredd - tum(24), INNEHALL_SLUT - y, luft);
  const runs: Run[] = b.punkter.flatMap((p, i): Run[] => {
    const radslut = i < b.punkter.length - 1 ? { breakLine: true } : {};
    const punkt: Run = {
      text: p.se ? `${p.text} ` : p.text,
      options: { bullet: { characterCode: "25AA", indent: 16 }, paraSpaceAfter: luft * 72, ...(p.se ? {} : radslut) },
    };
    if (!p.se) return [punkt];
    return [punkt, { text: p.se.text, options: { color: FARG.fokus, ...lank(lankar, p.se.mal), ...radslut } }];
  });
  slide.addText(runs, { ...stil(R.brod, FARG.black), ...passa, x: M, y, w: bredd, h: INNEHALL_SLUT - y });
  sidfot(slide, b.sidfot);
}

function kapitelListaBild(slide: PptxGenJS.Slide, b: KapitelListaBild, lankar: Lankar): void {
  kicker(slide, b.kicker);
  const y = rubrik(slide, enkel("Kapitlen i korthet"), R.avsnitt, "avsnitt") + rum(5);
  const statusar: Status[] = ["gron", "gul", "rod"];
  const huvud: PptxGenJS.TableRow = [
    cell("Kapitel", R.notStark, FARG.text2),
    cell("Indikatorer", R.notStark, FARG.text2, { align: "right" }),
    ...statusar.map((s) => cell(STATUSORD[s], R.notStark, FARG.status[s].text, { align: "right" })),
  ];
  const rader: PptxGenJS.TableRow[] = b.rader.map((r) => [
    {
      text: [
        { text: r.nummer, options: { color: FARG.fokus, bold: true, ...lank(lankar, r.mal) } },
        { text: "  ", options: {} },
        { text: r.namn, options: { color: FARG.black } },
      ],
      options: cellStil(R.granssnitt, FARG.black),
    },
    cell(String(r.indikatorer), R.granssnitt, FARG.black, { align: "right" }),
    ...statusar.map((s) => cell(String(r.status[s]), R.granssnitt, FARG.black, { align: "right" })),
  ]);
  slide.addTable([huvud, ...rader], { x: M, y, w: INNERBREDD, colW: [5.1, 1.0, 0.95, 0.95, 1.0], rowH: 0.33 });
  if (b.rader.some((r) => r.beskrivande > 0)) {
    slide.addText("Beskrivande mått saknar status och räknas bara under Indikatorer.", {
      ...stil(R.not, FARG.text3), x: M, y: INNEHALL_SLUT - R.not.radhojd, w: INNERBREDD, h: R.not.radhojd,
    });
  }
  sidfot(slide, b.sidfot);
}

/** Läget i korthet (stilguiden 5.8): grupperad per avsnitt, status i ord på statusens botten. */
function lagetBild(slide: PptxGenJS.Slide, b: LagetBild): void {
  kicker(slide, b.kicker);
  const y = rubrik(slide, enkel(b.sida === 0 ? "Läget i korthet" : "Läget i korthet (forts.)"), R.avsnitt, "avsnitt") + rum(4);
  const kolumner = b.harPlats ? 4 : 3;
  const huvud: PptxGenJS.TableRow = [
    cell("Indikator", R.notStark, FARG.text2),
    cell("Senaste", R.notStark, FARG.text2, { align: "right" }),
    ...(b.harPlats ? [cell("Plats", R.notStark, FARG.text2, { align: "right" })] : []),
    cell("Status", R.notStark, FARG.text2, { align: "center" }),
  ];
  const ingen = { type: "none" as const };
  const rader: PptxGenJS.TableRow[] = b.rader.map((r): PptxGenJS.TableRow => {
    // Avsnittets namn som gruppetikett, utan linje (raderna under har sina)
    if (r.typ === "grupp") {
      return [{ text: r.namn, options: { ...cellStil(R.granssnittStark, FARG.black), border: [ingen, ingen, ingen, ingen], colspan: kolumner } }];
    }
    return [
      cell(r.namn, R.granssnitt, FARG.black),
      {
        // Perioden efter värdet när den skiljer sig från kapitlets, i typ.roll.not farg.text3
        text: [
          ...(r.period ? [{ text: `${r.period}  `, options: { fontSize: R.not.fontSize, color: FARG.text3 } }] : []),
          { text: r.senaste, options: {} },
        ],
        options: cellStil(R.granssnitt, FARG.black, { align: "right" }),
      },
      ...(b.harPlats ? [cell(r.plats || "–", R.granssnitt, r.plats ? FARG.black : FARG.text3, { align: "right" })] : []),
      statusCell(r.status),
    ];
  });
  const k = LAGET_KOLUMNER;
  const colW = b.harPlats ? [k.namn, k.senaste, k.plats, k.status] : [k.namn + k.plats, k.senaste, k.status];
  slide.addTable([huvud, ...rader], { x: M, y, w: INNERBREDD, colW, rowH: 0.27 });
  sidfot(slide, b.sidfot);
}

function avsnittBild(slide: PptxGenJS.Slide, b: AvsnittBild, lankar: Lankar): void {
  kicker(slide, b.kicker);
  let y = rubrik(slide, [
    { text: `${b.nummer}  `, options: { color: FARG.fokus } },
    { text: b.namn, options: { color: FARG.black } },
  ], R.avsnitt, "avsnitt") + rum(4);
  if (b.dek) {
    const dB = INNERBREDD * 0.82;
    const h = Math.min(3, rader(b.dek, "ingress", dB)) * R.ingress.radhojd;
    slide.addText(b.dek, { ...stil(R.ingress, FARG.text2), x: M, y, w: dB, h });
    y += h;
  }
  y += rum(5);
  // Avsnittets indikatorer med nummer, som länkar till sina bilder
  const runs: Run[] = b.indikatorer.flatMap((x, i): Run[] => [
    { text: x.nummer, options: { color: FARG.fokus, bold: true, paraSpaceAfter: R.granssnitt.fontSize * 0.5, ...lank(lankar, x.mal) } },
    { text: "  ", options: {} },
    { text: x.namn, options: { color: FARG.black, ...(i < b.indikatorer.length - 1 ? { breakLine: true } : {}) } },
  ]);
  slide.addText(runs, { ...stil(R.granssnitt, FARG.black), x: M, y, w: INNERBREDD, h: INNEHALL_SLUT - y });
  sidfot(slide, b.sidfot);
}


/** Höjden i tum som en text i en roll behöver i given bredd. */
const textHojd = (text: string, rollnamn: Rollnamn, bredd: number, maxRader: number, stark = false): number =>
  Math.min(maxRader, rader(text, rollnamn, bredd, stark)) * roll(rollnamn, stark).radhojd;

/** Analysen i så många meningar (högst bildens, minst en) som ryms i höjden. */
function analysSomRyms(analys: string, bredd: number, hojd: number): string {
  const m = meningar(analys);
  for (let n = m.length; n > 1; n--) {
    const text = m.slice(0, n).join(" ");
    if (rader(text, "brod", bredd) * R.brod.radhojd <= hojd) return text;
  }
  return m[0] ?? "";
}

/**
 * Indikatorbilden (stilguiden 4.4 och 6.9): kicker = kapitlet, titel =
 * indikatorns nummer och namn med statusmarkören sist på raden, nyckeltalsraden,
 * analysen med proveniens, figurens titel och undertitel, grafen och noten,
 * källraden i sidfoten.
 *
 * Två layouter. Standard: text till vänster, figuren (titel, undertitel, graf,
 * not) till höger. Hög: när grafen behöver mer höjd än som blir över under
 * figurens titel (rangordning av 21 regioner) får grafen hela högerspalten och
 * figurens titel, undertitel och not står längst ned i vänsterspalten.
 */
function indikatorBild(slide: PptxGenJS.Slide, b: IndikatorBild): void {
  kicker(slide, b.kicker);
  // Rubrikrad: nummer + namn, statusmarkören sist på raden (stilguiden 4.4)
  const markor = b.status ? markorBredd(b.status) + rum(4) : 0;
  const rubrikY = KICKER_Y + R.not.radhojd + rum(2);
  const rubrikSlut = rubrik(slide, [
    { text: `${b.nummer}  `, options: { color: FARG.fokus } },
    { text: b.sida > 0 ? `${b.namn} (forts.)` : b.namn, options: { color: FARG.black } },
  ], R.indikator, "indikator", INNERBREDD - markor);
  if (b.status) statusMarkor(slide, b.status, B - M, rubrikY + (R.indikator.radhojd - tum(tema.komponent.statusmarkor.hojd)) / 2);

  const top = Math.max(INNEHALL_Y, rubrikSlut + rum(4));
  // En källrad på två rader tar en rad från innehållet
  const slut = INNEHALL_SLUT - (sidfotRader(b.sidfot) - 1) * R.not.radhojd;
  const spec = b.spec;

  // Figurens texter och noten (noten beror inte på grafens höjd)
  const noter = grafPlan(spec, { x: HOGER_X, y: top, b: HOGER_B, h: 2 }, b.sida).noter;
  const notText = noter.length ? `Not: ${noter.join(" ")}` : "";
  const figurTexter = (bredd: number) => {
    const tH = textHojd(spec.titel, "figurtitel", bredd, 2, true);
    const uH = textHojd(spec.undertitel, "granssnitt", bredd, 4);
    const nH = notText ? textHojd(notText, "not", bredd, 3) : 0;
    return { tH, uH, nH };
  };
  const std = figurTexter(HOGER_B);
  const stdGraf = slut - (top + std.tH + std.uH + rum(4)) - (std.nH ? std.nH + rum(2) : 0);
  const hog = stdGraf < minstaHojd(spec);

  // Vänster spalt: nyckeltalsraden, analysen och proveniensen (stilguiden 4.4)
  const nyckeltal: Run[] = [
    { text: b.nyckeltal.varde, options: { bold: true, color: FARG.black } },
    ...b.nyckeltal.delar.flatMap((d): Run[] => [
      { text: "  ·  ", options: { color: FARG.text3 } },
      { text: d, options: { color: FARG.text2 } },
    ]),
  ];
  const nH = textHojd([b.nyckeltal.varde, ...b.nyckeltal.delar].join("  ·  "), "granssnitt", VANSTER_B, 2);
  slide.addText(nyckeltal, { ...stil(R.granssnitt, FARG.black), x: M, y: top, w: VANSTER_B, h: nH });

  // Hög layout: figurens texter längst ned i vänsterspalten
  let vansterSlut = slut;
  if (hog) {
    const v = figurTexter(VANSTER_B);
    let y = slut - v.nH - (v.nH ? rum(2) : 0) - v.uH - v.tH;
    vansterSlut = y - rum(5);
    slide.addText(spec.titel, { ...stil(R.figurtitel, FARG.black), x: M, y, w: VANSTER_B, h: v.tH });
    y += v.tH;
    slide.addText(spec.undertitel, { ...stil(R.granssnitt, FARG.text2), x: M, y, w: VANSTER_B, h: v.uH });
    if (notText) slide.addText(notText, { ...stil(R.not, FARG.text3), x: M, y: slut - v.nH, w: VANSTER_B, h: v.nH });
  }
  if (b.sida === 0 && b.analys) {
    const provH = R.not.radhojd;
    const aY = top + nH + rum(5);
    const aH = vansterSlut - provH - rum(3) - aY;
    const text = analysSomRyms(b.analys, VANSTER_B, aH);
    slide.addText(text, { ...stil(R.brod, FARG.black), x: M, y: aY, w: VANSTER_B, h: aH });
    slide.addText("AI-analys, genererad ur rapportens data.", { ...stil(R.not, FARG.text3), x: M, y: vansterSlut - provH, w: VANSTER_B, h: provH });
  }

  // Höger spalt: figurens titel och undertitel, grafen och noten (stilguiden 6.1)
  let ruta: Ruta;
  if (hog) {
    ruta = { x: HOGER_X, y: top, b: HOGER_B, h: slut - top };
  } else {
    slide.addText(spec.titel, { ...stil(R.figurtitel, FARG.black), x: HOGER_X, y: top, w: HOGER_B, h: std.tH });
    slide.addText(spec.undertitel, { ...stil(R.granssnitt, FARG.text2), x: HOGER_X, y: top + std.tH, w: HOGER_B, h: std.uH });
    const grafY = top + std.tH + std.uH + rum(4);
    ruta = { x: HOGER_X, y: grafY, b: HOGER_B, h: stdGraf };
    if (notText) slide.addText(notText, { ...stil(R.not, FARG.text3), x: HOGER_X, y: slut - std.nH, w: HOGER_B, h: std.nH });
  }
  ritaGraf(slide, grafPlan(spec, ruta, b.sida));

  sidfot(slide, b.sidfot);
}

function kallBild(slide: PptxGenJS.Slide, b: KallBild): void {
  kicker(slide, b.kicker);
  const y = rubrik(slide, enkel("Källor och leveranskedja"), R.avsnitt, "avsnitt") + rum(4);
  const huvud: PptxGenJS.TableRow = [
    cell("Källa", R.notStark, FARG.text2),
    cell("Huvudman och typ", R.notStark, FARG.text2),
    cell("Indikatorer", R.notStark, FARG.text2, { align: "right" }),
  ];
  const rader: PptxGenJS.TableRow[] = b.poster.map((p): PptxGenJS.TableRow => [
    { text: [{ text: p.namn, options: { color: FARG.black, ...(p.url ? { hyperlink: { url: p.url } } : {}) } }], options: cellStil(R.granssnitt, FARG.black) },
    cell([p.huvudman, p.typ].filter(Boolean).join(" · "), R.not, FARG.text2),
    cell(p.leverans ? "leverans" : p.indikatorer !== undefined ? String(p.indikatorer) : "–", R.granssnitt, p.leverans ? FARG.text3 : FARG.black, { align: "right" }),
  ]);
  slide.addTable([huvud, ...rader], { x: M, y, w: INNERBREDD, colW: [4.1, 3.7, 1.2], rowH: 0.27 });
  const h = R.granssnitt.radhojd + R.not.radhojd + rum(1);
  slide.addText([
    { text: "Vägen till rapporten: ", options: { bold: true } },
    { text: b.vag, options: { breakLine: true } },
    { text: "Beskrivningar av källorna och metoden finns i webbrapporten under Om statistiken.", options: { color: FARG.text3, fontSize: R.not.fontSize } },
  ], { ...stil(R.granssnitt, FARG.black), x: M, y: INNEHALL_SLUT - h, w: INNERBREDD, h });
  sidfot(slide, b.sidfot);
}

// ════════════════════════════════════════════════════════════
//  Decket
// ════════════════════════════════════════════════════════════

/** Filnamnsvänlig sträng: gemener, åäö översatta, bara bokstäver, siffror och bindestreck. */
export function slug(s: string): string {
  return s.toLowerCase()
    .replace(/[åä]/g, "a").replace(/ö/g, "o").replace(/é/g, "e")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export interface PptxAlternativ extends DeckVal {
  /** Filnamn utan ändelse. Förval: halland-{titel}-{datum}. */
  filnamn?: string;
}

export interface ByggdPptx {
  pptx: PptxGenJS;
  filnamn: string;
  bilder: Bild[];
}

/** Bygger presentationen utan att spara den (röktestet och testerna sparar själva). */
export function byggPptx(kapitel: KapitelModell[], alt: PptxAlternativ): ByggdPptx {
  const bilder = planeraDeck(kapitel, alt);
  const datum = new Date().toISOString().slice(0, 10);
  return { pptx: ritaDeck(bilder, alt.titel), filnamn: alt.filnamn ?? `halland-${slug(alt.titel)}-${datum}`, bilder };
}

/** Ritar en färdig lista bilder. Länkar mellan bilderna löses upp mot bildernas id. */
export function ritaDeck(bilder: Bild[], titel: string): PptxGenJS {
  const lankar: Lankar = new Map(bilder.map((b, i) => [b.id, i + 1]));
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "Region Halland";
  pptx.company = "Region Halland";
  pptx.title = titel;
  pptx.subject = "HoS-rapporten";
  pptx.theme = { headFontFace: TYPSNITT.serif, bodyFontFace: TYPSNITT.sans };

  for (const b of bilder) {
    const slide = pptx.addSlide();
    slide.background = { color: FARG.yta };
    switch (b.typ) {
      case "titel": titelBild(slide, b); break;
      case "viktigast": viktigastBild(slide, b, lankar); break;
      case "kapitelLista": kapitelListaBild(slide, b, lankar); break;
      case "laget": lagetBild(slide, b); break;
      case "avsnitt": avsnittBild(slide, b, lankar); break;
      case "indikator": indikatorBild(slide, b); break;
      case "kallor": kallBild(slide, b); break;
    }
  }
  return pptx;
}

/**
 * Bygger presentationen och sparar den: nedladdning i webbläsaren, fil i
 * arbetskatalogen i Node. Signaturen är stubbens från WP0.
 */
export async function exporteraPptx(kapitel: KapitelModell[], alt: PptxAlternativ): Promise<void> {
  const { pptx, filnamn } = byggPptx(kapitel, alt);
  await pptx.writeFile({ fileName: `${filnamn}.pptx` });
}
