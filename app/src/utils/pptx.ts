import pptxgen from "pptxgenjs";
import type { KpiData, Section, VyData } from "../types";
import { SIGNAL_COLORS, SIGNAL_LABELS } from "../charts/constants";
import { fmtVarde, fmtSuffix, periodRangeLabel } from "./format";
import { getBlocks } from "../stores/blocks";

// ════════════════════════════════════════════════════════════
//  pptx.ts — Ladda ner ett kapitel som PowerPoint.
//
//  Vad decket innehåller, i ordning:
//    1. Titelbild
//    2. Kapitlets översikt: räknare + bedömning + egna anteckningar
//    3. Ett avsnittsblad per avsnitt: bedömning + indikatorlista med utfall
//    4. En bild per indikator: utfall, placering, bedömning och graf
//    5. Källförteckning
//
//  GRAFVALET: bilderna får NATIVA PowerPoint-diagram, inte skärmbilder av
//  webbens SVG. Skälet är att ett underlag som ska klistras in i andras
//  presentationer måste gå att redigera, byta färg på och skala om. Priset är
//  att de tjugo gråa kontextlinjerna utelämnas: tjugotre serier i en
//  diagramlegend blir oläsligt. I stället ritas den tolkning som bär
//  rapportens signal, nämligen gränsen till topp 3, som en egen serie. Vem som
//  helst kan då se om Halland ligger innanför eller utanför målet. Hela fältet
//  av regioner finns kvar i webbrapporten.
//
//  Egna anteckningar (localStorage, nyckel `${vy}:${targetId}`) följer med, så
//  att det man skrivit i rapporten kommer med i underlaget.
// ════════════════════════════════════════════════════════════

const BRAND = "00664D";
const BRAND_LJUS = "00AB60";
const INK = "1A1A1A";
const DAMPAD = "6B7270";
const SVAG = "A9ADA8";
const RIKET = "8C9490";
const TOPP3 = "9FCDB3";

const SANS = "IBM Plex Sans";
const SERIF = "Source Serif 4";

/** Bredd/höjd i tum för LAYOUT_16x9. */
const W = 10;
const H = 5.625;

export interface PptxUnderlag {
  /** Sektionerna som ska med, i visningsordning. */
  sektioner: Section[];
  /** Aktiv vy, för periodetikett och för nyckeln till egna anteckningar. */
  vyData: VyData;
  /** Rapportens titel: kapitelnamnet, eller "Hela rapporten". */
  titel: string;
  /** Kategorin kapitlet hör till, skrivs som kicker på titelbilden. */
  kicker?: string;
}

/** Filnamnsvänlig sträng: gemener, åäö översatta, bara bokstäver och bindestreck. */
function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/å|ä/g, "a").replace(/ö/g, "o").replace(/é/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Dagens datum som ISO, för filnamn och kolofon. */
function idag(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Egna anteckningar för ett mål (indikator, avsnitt eller kapitel). */
function anteckningar(vy: string, targetId: string): string[] {
  return getBlocks(`${vy}:${targetId}`)
    .map((b) => [b.title?.trim(), b.text?.trim()].filter(Boolean).join(": "))
    .filter((t) => t.length > 0);
}

/** Värde + enhet, som det står i rapportens readout. */
function utfall(kpi: KpiData): string {
  return `${fmtVarde(kpi.senaste, kpi.enhet)}${fmtSuffix(kpi.enhet)}`;
}

/** "Plats 4/21", eller tom sträng för mått utan målriktning. */
function placering(kpi: KpiData): string {
  if (kpi.rank == null || kpi.rank_av == null) return "";
  return `Plats ${kpi.rank}/${kpi.rank_av}`;
}

/** Statusetikett; neutrala volymmått saknar målriktning och märks därefter. */
function statusText(kpi: KpiData): string {
  return kpi.utan_mal ? "UTAN MÅLRIKTNING" : (SIGNAL_LABELS[kpi.status] ?? "").toUpperCase();
}

function statusFarg(kpi: KpiData): string {
  if (kpi.utan_mal) return DAMPAD;
  return (SIGNAL_COLORS[kpi.status] ?? "#333333").replace("#", "");
}

// ── Sidfot: samma rad på varje bild utom titelbilden ──
function sidfot(slide: pptxgen.Slide, text: string) {
  slide.addShape("line", {
    x: 0.5, y: H - 0.52, w: W - 1, h: 0,
    line: { color: "E4E4E0", width: 0.75 },
  });
  slide.addText(text, {
    x: 0.5, y: H - 0.46, w: W - 1, h: 0.3,
    fontFace: SANS, fontSize: 8.5, color: SVAG,
  });
}

// ── Bildrubrik: grön hårlinje + kicker + titel ──
function rubrik(slide: pptxgen.Slide, kicker: string, titel: string) {
  slide.addShape("line", {
    x: 0.5, y: 0.42, w: W - 1, h: 0,
    line: { color: BRAND, width: 1.75 },
  });
  slide.addText(kicker.toUpperCase(), {
    x: 0.5, y: 0.5, w: W - 1, h: 0.22,
    fontFace: SANS, fontSize: 9, bold: true, charSpacing: 1.6, color: BRAND,
  });
  slide.addText(titel, {
    x: 0.5, y: 0.74, w: W - 1, h: 0.52,
    fontFace: SERIF, fontSize: 22, bold: true, color: INK,
  });
}

// ── Tidsserie som ett nativt linjediagram ──────────────────────────────────
// Kategoriaxeln är Hallands egen serie. Riket och topp 3-gränsen matchas per
// etikett, så att luckor i deras serier blir hål och inte förskjutningar.
function laggTillGraf(pptx: pptxgen, slide: pptxgen.Slide, kpi: KpiData) {
  const labels = kpi.tidsserie.map((p) => p.etikett);
  const serier: { name: string; labels: string[]; values: (number | null)[] }[] = [
    { name: "Halland", labels, values: kpi.tidsserie.map((p) => p.varde) },
  ];
  const farger = [BRAND];

  if (kpi.riket_serie?.length) {
    const per = new Map(kpi.riket_serie.map((p) => [p.etikett, p.varde]));
    serier.push({ name: "Riket", labels, values: labels.map((l) => per.get(l) ?? null) });
    farger.push(RIKET);
  }

  if (kpi.topp3_band?.length) {
    // Bandets kant mot tredjeplatsen beror på riktningen: när lägre är bättre
    // ligger den vid hi, annars vid lo.
    const per = new Map(
      kpi.topp3_band.map((p) => [p.etikett, kpi.inverterad ? p.hi : p.lo]),
    );
    serier.push({
      name: "Gräns topp 3",
      labels,
      values: labels.map((l) => per.get(l) ?? null),
    });
    farger.push(TOPP3);
  }

  slide.addChart(pptx.ChartType.line, serier, {
    x: 4.25, y: 1.32, w: 5.35, h: 3.5,
    chartColors: farger,
    lineSize: 2.25,
    lineDataSymbol: "none",
    lineSmooth: false,
    showLegend: true,
    legendPos: "b",
    legendFontFace: SANS,
    legendFontSize: 9,
    catAxisLabelFontFace: SANS,
    catAxisLabelFontSize: 8.5,
    catAxisLabelColor: DAMPAD,
    valAxisLabelFontFace: SANS,
    valAxisLabelFontSize: 8.5,
    valAxisLabelColor: DAMPAD,
    valAxisLabelFormatCode: kpi.enhet === "procent" ? "#,##0.0" : "#,##0",
    valGridLine: { color: "EDEDEA", style: "solid", size: 0.75 },
    catGridLine: { style: "none" },
    border: { pt: 0, color: "FFFFFF" },
  });
}

// ── Titelbild ──
function titelBild(pptx: pptxgen, u: PptxUnderlag, antalIndikatorer: number) {
  const s = pptx.addSlide();
  s.background = { color: BRAND };

  s.addText("REGION HALLAND · UPPFÖLJNING", {
    x: 0.7, y: 1.35, w: W - 1.4, h: 0.28,
    fontFace: SANS, fontSize: 10, bold: true, charSpacing: 2, color: "9FE0C4",
  });
  s.addText(u.titel, {
    x: 0.7, y: 1.7, w: W - 1.4, h: 1.4,
    fontFace: SERIF, fontSize: 38, bold: true, color: "FFFFFF", valign: "top",
  });
  s.addShape("line", {
    x: 0.7, y: 3.25, w: 2.2, h: 0,
    line: { color: BRAND_LJUS, width: 2.25 },
  });
  s.addText(
    u.kicker
      ? `${u.kicker} · Hälso- och sjukvårdsrapporten (SKR)`
      : "Hälso- och sjukvårdsrapporten (SKR)",
    {
      x: 0.7, y: 3.45, w: W - 1.4, h: 0.3,
      fontFace: SANS, fontSize: 13, color: "D3EFE0",
    },
  );
  s.addText(
    `${antalIndikatorer} indikatorer · ${u.vyData.etikett} ${u.vyData.period} · Underlag ur Kolada · Genererad ${idag()}`,
    {
      x: 0.7, y: 4.6, w: W - 1.4, h: 0.3,
      fontFace: SANS, fontSize: 9.5, color: "9FE0C4",
    },
  );
}

// ── Räknarrad: antal, i fas, bevaka, avvikelse ──
function raknare(slide: pptxgen.Slide, kpier: KpiData[], y: number) {
  const antal = (st: string) => kpier.filter((k) => k.status === st && !k.utan_mal).length;
  const poster: { tal: number; etikett: string; farg: string }[] = [
    { tal: kpier.length, etikett: "indikatorer", farg: INK },
    { tal: antal("gron"), etikett: "i fas", farg: SIGNAL_COLORS.gron.replace("#", "") },
    { tal: antal("gul"), etikett: "att bevaka", farg: SIGNAL_COLORS.gul.replace("#", "") },
    { tal: antal("rod"), etikett: "avvikelse", farg: SIGNAL_COLORS.rod.replace("#", "") },
  ];
  poster.forEach((p, i) => {
    const x = 0.5 + i * 1.55;
    slide.addText(String(p.tal), {
      x, y, w: 1.4, h: 0.42,
      fontFace: SANS, fontSize: 26, bold: true, color: p.farg,
    });
    slide.addText(p.etikett, {
      x, y: y + 0.42, w: 1.4, h: 0.24,
      fontFace: SANS, fontSize: 9, color: DAMPAD,
    });
  });
}

// ── Översiktsbild för ett kapitel ──
function oversiktsBild(pptx: pptxgen, sek: Section, vy: string) {
  const s = pptx.addSlide();
  rubrik(s, "Översikt", sek.namn);
  raknare(s, sek.kpier, 1.42);

  s.addText(sek.analys, {
    x: 0.5, y: 2.28, w: W - 1, h: 1.5,
    fontFace: SERIF, fontSize: 13, color: "3A3F40", lineSpacingMultiple: 1.3,
    valign: "top",
  });

  const egna = anteckningar(vy, sek.id);
  if (egna.length > 0) {
    s.addText("Egna anteckningar", {
      x: 0.5, y: 3.85, w: W - 1, h: 0.24,
      fontFace: SANS, fontSize: 9, bold: true, charSpacing: 1.4, color: BRAND,
    });
    s.addText(egna.map((t) => ({ text: t, options: { bullet: true } })), {
      x: 0.5, y: 4.1, w: W - 1, h: 0.9,
      fontFace: SANS, fontSize: 10.5, color: "3A3F40", valign: "top",
    });
  }

  sidfot(s, "Signalen är en placering bland regionerna: plats 1–3 i fas, 4–7 att bevaka, 8 eller lägre avvikelse.");
}

// ── Avsnittsblad: bedömning + indikatorlista ──
function avsnittsBild(pptx: pptxgen, sek: Section, del: Section, nr: number, vy: string) {
  const s = pptx.addSlide();
  rubrik(s, `Avsnitt ${nr}`, del.namn);

  s.addText(del.analys, {
    x: 0.5, y: 1.32, w: W - 1, h: 0.95,
    fontFace: SERIF, fontSize: 12, color: "3A3F40", lineSpacingMultiple: 1.28,
    valign: "top",
  });

  const egna = anteckningar(vy, del.id);
  if (egna.length > 0) {
    s.addText(egna.map((t) => ({ text: t, options: { bullet: true } })), {
      x: 0.5, y: 2.2, w: W - 1, h: 0.5,
      fontFace: SANS, fontSize: 9.5, color: BRAND, valign: "top",
    });
  }

  const rader: pptxgen.TableRow[] = [
    [
      { text: "Indikator", options: { bold: true, color: DAMPAD, fontSize: 9 } },
      { text: "Halland", options: { bold: true, color: DAMPAD, fontSize: 9, align: "right" } },
      { text: "Placering", options: { bold: true, color: DAMPAD, fontSize: 9, align: "right" } },
      { text: "Status", options: { bold: true, color: DAMPAD, fontSize: 9 } },
    ],
    ...del.kpier.map((k): pptxgen.TableRow => [
      { text: k.namn, options: { fontSize: 10, color: INK } },
      { text: utfall(k), options: { fontSize: 10, color: INK, align: "right" } },
      { text: placering(k) || "–", options: { fontSize: 10, color: DAMPAD, align: "right" } },
      { text: statusText(k), options: { fontSize: 9, bold: true, color: statusFarg(k) } },
    ]),
  ];

  s.addTable(rader, {
    x: 0.5, y: 2.42, w: W - 1,
    colW: [5.0, 1.4, 1.3, 1.3],
    border: { type: "solid", color: "EDEDEA", pt: 0.75 },
    fontFace: SANS,
    rowH: 0.28,
    valign: "middle",
  });

  sidfot(s, `${sek.namn} · Hälso- och sjukvårdsrapporten (SKR)`);
}

// ── Indikatorbild: utfall, placering, bedömning och graf ──
function indikatorBild(pptx: pptxgen, sek: Section, kpi: KpiData, vy: string) {
  const s = pptx.addSlide();
  rubrik(s, sek.namn, kpi.namn);

  // Statusmärke + readout
  s.addText(statusText(kpi), {
    x: 0.5, y: 1.32, w: 1.8, h: 0.24,
    fontFace: SANS, fontSize: 9, bold: true, charSpacing: 1.2, color: statusFarg(kpi),
  });
  const readout = [`Halland ${utfall(kpi)}`, placering(kpi)].filter(Boolean).join("   ·   ");
  s.addText(readout, {
    x: 0.5, y: 1.58, w: 3.5, h: 0.3,
    fontFace: SANS, fontSize: 13, bold: true, color: INK,
  });

  s.addText(kpi.analystext, {
    x: 0.5, y: 2.0, w: 3.5, h: 2.5,
    fontFace: SERIF, fontSize: 10.5, color: "3A3F40", lineSpacingMultiple: 1.26,
    valign: "top",
  });

  const egna = anteckningar(vy, kpi.id);
  if (egna.length > 0) {
    s.addText(egna.map((t) => ({ text: t, options: { bullet: true } })), {
      x: 0.5, y: 4.4, w: 3.5, h: 0.6,
      fontFace: SANS, fontSize: 9, color: BRAND, valign: "top",
    });
  }

  laggTillGraf(pptx, s, kpi);

  const period = periodRangeLabel(kpi.tidsserie, "ar");
  const kalla = kpi.kalla ? `Källa: ${kpi.kalla.namn}` : "Källa: Kolada";
  sidfot(s, `${kalla} · ${period} · Övriga regioners linjer finns i webbrapporten.`);
}

// ── Källförteckning ──
function kallBild(pptx: pptxgen, sek: Section) {
  const poster = [...(sek.kallor ?? []), ...(sek.leverans ?? [])];
  if (poster.length === 0) return;

  const s = pptx.addSlide();
  rubrik(s, "Källor", "Varifrån siffrorna kommer");

  const rader: pptxgen.TableRow[] = [
    [
      { text: "Källa", options: { bold: true, color: DAMPAD, fontSize: 9 } },
      { text: "Typ och huvudman", options: { bold: true, color: DAMPAD, fontSize: 9 } },
      { text: "Indikatorer", options: { bold: true, color: DAMPAD, fontSize: 9, align: "right" } },
    ],
    ...poster.map((k): pptxgen.TableRow => [
      { text: k.namn, options: { fontSize: 10, color: INK } },
      { text: `${k.typ} · ${k.huvudman}`, options: { fontSize: 9, color: DAMPAD } },
      {
        text: k.n_indikatorer != null ? String(k.n_indikatorer) : "leverans",
        options: { fontSize: 9, color: DAMPAD, align: "right" },
      },
    ]),
  ];

  s.addTable(rader, {
    x: 0.5, y: 1.4, w: W - 1,
    colW: [3.9, 4.0, 1.1],
    border: { type: "solid", color: "EDEDEA", pt: 0.75 },
    fontFace: SANS,
    rowH: 0.3,
    valign: "middle",
  });

  sidfot(s, "Fullständiga källbeskrivningar och Koladas egna formuleringar finns i webbrapporten.");
}

/** Delar upp en sektion i sina avsnitt. Sektion utan avsnitt ger sig själv. */
function avsnitt(sek: Section): Section[] {
  if (!sek.delar || sek.delar.length === 0) return [];
  const per = new Map(sek.kpier.map((k) => [k.id, k]));
  return sek.delar.map((d) => ({
    id: d.id,
    namn: d.namn,
    analys: d.analys,
    kpier: d.kpi_ids.map((id) => per.get(id)).filter((k): k is KpiData => !!k),
  }));
}

/** Bygg och ladda ner presentationen. */
export async function exporteraPptx(u: PptxUnderlag): Promise<void> {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "Region Halland";
  pptx.company = "Region Halland";
  pptx.title = u.titel;
  pptx.subject = "Hälso- och sjukvårdsrapporten";

  const allaKpier = u.sektioner.flatMap((s) => s.kpier);
  titelBild(pptx, u, allaKpier.length);

  for (const sek of u.sektioner) {
    oversiktsBild(pptx, sek, u.vyData.vy);

    const delar = avsnitt(sek);
    if (delar.length > 0) {
      delar.forEach((del, i) => {
        avsnittsBild(pptx, sek, del, i + 1, u.vyData.vy);
        del.kpier.forEach((kpi) => indikatorBild(pptx, sek, kpi, u.vyData.vy));
      });
    } else {
      sek.kpier.forEach((kpi) => indikatorBild(pptx, sek, kpi, u.vyData.vy));
    }

    kallBild(pptx, sek);
  }

  await pptx.writeFile({ fileName: `halland-${slug(u.titel)}-${idag()}.pptx` });
}
