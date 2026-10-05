// figur/nedladdning.ts: CSV, SVG och PNG ur en figur (stilguiden 6.8).
// Ägare: WP4.
//
// CSV:  semikolon, decimalkomma, BOM och CRLF så att svensk Excel öppnar filen
//       med tal som tal och å, ä, ö rätt. Tal skrivs utan tusentalsavgränsare och
//       med vanligt bindestreck som minus (annars blir de text i Excel).
// SVG:  diagrammets SVG med titel, undertitel, noter och källa inbakade som
//       text, beräknade stilar inskrivna på varje element (CSS Modules följer inte
//       med en fristående fil) och typsnittet inbäddat som @font-face (data-URI),
//       så att filen ser likadan ut utanför rapporten och vid rastrering.
// PNG:  SVG:n ritad på en canvas i dubbel upplösning.
// Filnamn: `{indikator}-{vy}-{period}.{ändelse}`.
//
// Det rena (filnamn, CSV, radbrytning, sammansättning av SVG) testas i node;
// det som kräver DOM (tillSvg, tillPng, typsnittCss, sparaFil) körs i webbläsaren.

import type { ChartSpec, VisningId } from "../charts/spec";
import type { VyId } from "../data/modell";
import { periodIntervall } from "../design/format";
import { tema, type Tema } from "../design/tema";
import plexLatin from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2?url";

type Andelse = "csv" | "svg" | "png";

// ════════════════════════════════════════════════════════════
//  Filnamn
// ════════════════════════════════════════════════════════════

/** Gemener, a–z och siffror, bindestreck mellan ord: "jan 2021–mar 2026" → "jan-2021-mar-2026". */
export function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Filnamn enligt `{indikator}-{vy}-{period}.{ändelse}`. Tomma delar utelämnas. */
export function filnamn(spec: ChartSpec, vy: string, period: string, andelse: Andelse): string {
  const delar = [slug(spec.id) || "figur", slug(vy), slug(period)].filter(Boolean);
  return `${delar.join("-")}.${andelse}`;
}

const DAG_MS = 86_400_000;
const lasDag = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, (m || 1) - 1, d || 1);
};

/** Tidsupplösningen härledd ur avståndet mellan två perioder i första serien med punkter. */
export function tidsupplosning(spec: ChartSpec): VyId | null {
  const serie = spec.serier.find((s) => (s.punkter?.length ?? 0) >= 2);
  if (!serie?.punkter) return null;
  const dagar = Math.round((lasDag(serie.punkter[1].period) - lasDag(serie.punkter[0].period)) / DAG_MS);
  if (!Number.isFinite(dagar) || dagar <= 0) return null;
  if (dagar <= 1) return "dag";
  if (dagar <= 7) return "vecka";
  if (dagar <= 31) return "manad";
  if (dagar <= 92) return "kvartal";
  return "ar";
}

/** Första och sista perioden bland alla seriers punkter. */
export function periodspann(spec: ChartSpec): { fran: string; till: string } | null {
  let fran: string | null = null;
  let till: string | null = null;
  for (const s of spec.serier) {
    for (const p of s.punkter ?? []) {
      if (fran === null || p.period < fran) fran = p.period;
      if (till === null || p.period > till) till = p.period;
    }
  }
  return fran && till ? { fran, till } : null;
}

/**
 * Filnamnet för figurens nuvarande innehåll: vy och period ur serierna, annars
 * visningen. kpiTillSpec (WP1) sätter spec.id = `{indikator}:{visning}[:{fokus}][:dagar]`;
 * indikatordelen blir indikatorns id, med fokusenheten efter när den inte är
 * indikatorns egen (så att Halmstad och regionen inte får samma namn).
 */
export function figurFilnamn(spec: ChartSpec, visning: VisningId | string, andelse: Andelse): string {
  const vy = tidsupplosning(spec);
  const spann = periodspann(spec);
  const period = vy && spann ? periodIntervall(spann.fran, spann.till, vy, "kort") : "";
  const [kpiId, , ...ovrigt] = spec.id.split(":");
  const indikator = [kpiId, ...ovrigt.filter((d) => d !== "dagar")].join("-");
  return filnamn({ ...spec, id: indikator }, vy ?? visning, period, andelse);
}

// ════════════════════════════════════════════════════════════
//  CSV
// ════════════════════════════════════════════════════════════

const BOM = "﻿";
const RADSLUT = "\r\n";

/** En cell i CSV: tal med decimalkomma, text citerad vid behov, saknat värde tomt. */
export function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "";
    return String(Number(v.toPrecision(12))).replace(".", ",");
  }
  let s = String(v);
  // Text som börjar med = + @ skulle tolkas som formel i Excel.
  if (/^[=+@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV med semikolon, decimalkomma och BOM ur figurens tabell. */
export function tillCsv(spec: ChartSpec): string {
  const { kolumner, rader } = spec.tabell;
  const linjer = [kolumner, ...rader].map((rad) => rad.map(csvCell).join(";"));
  return BOM + linjer.join(RADSLUT) + RADSLUT;
}

// ════════════════════════════════════════════════════════════
//  SVG
// ════════════════════════════════════════════════════════════

/** Mäter en textrad i px med en CSS-font, t.ex. "600 18px 'IBM Plex Sans Variable'". */
export type Matare = (text: string, font: string) => number;

export interface ExportText {
  kicker?: string;
  titel: string;
  undertitel: string;
  noter: string[];          // färdiga rader, t.ex. "Not: …"
  kalla?: string;           // "Källa: …"
  sammanfattning?: string;  // <desc>
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Radbryter vid vanliga mellanslag (aldrig vid hårt mellanslag) så att varje rad ryms i `max` px. */
export function radbryt(text: string, max: number, mat: (s: string) => number): string[] {
  const ord = text.split(" ").filter((o) => o.length > 0);
  const rader: string[] = [];
  let rad = "";
  for (const o of ord) {
    const forsok = rad ? `${rad} ${o}` : o;
    if (rad && mat(forsok) > max) {
      rader.push(rad);
      rad = o;
    } else {
      rad = forsok;
    }
  }
  if (rad) rader.push(rad);
  return rader;
}

/** Den första familjen i en font-family-lista, med citattecken: "'IBM Plex Sans Variable'". */
const forstaFamilj = (lista: string) => lista.split(",")[0].trim();

/**
 * Sätter ihop exportbilden: platta i `farg.yta`, kicker, titel och undertitel
 * ovanför diagrammet, noter och källa under. Mått och färger ur tema.ts.
 * `diagram.markup` är ett komplett <svg>-element i diagrammets egna koordinater.
 */
export function byggExportSvg(
  text: ExportText,
  diagram: { markup: string; bredd: number; hojd: number },
  mat: Matare,
  typsnitt = "",
  t: Tema = tema,
): { svg: string; bredd: number; hojd: number } {
  const luft = t.diagram.platta.luft;
  const bredd = Math.ceil(diagram.bredd + 2 * luft);
  const inner = diagram.bredd;
  const familj = t.typ.familj.sans;
  const delar: string[] = [];
  let y = luft;

  const block = (
    innehall: string,
    roll: { storlek: number; radhojd: number },
    vikt: number,
    farg: string,
  ) => {
    const font = `${vikt} ${roll.storlek}px ${familj}`;
    const lh = roll.storlek * roll.radhojd;
    const rader = radbryt(innehall, inner, (s) => mat(s, font));
    rader.forEach((r, i) => {
      // Baslinjen: halva radavståndet plus versalhöjden ungefär (0,8 em).
      const bas = y + i * lh + (lh - roll.storlek) / 2 + roll.storlek * 0.8;
      delar.push(
        `<text x="${luft}" y="${bas.toFixed(1)}" font-family="${esc(familj)}" font-size="${roll.storlek}" `
        + `font-weight="${vikt}" fill="${farg}">${esc(r)}</text>`,
      );
    });
    y += rader.length * lh;
  };

  const roll = t.typ.roll;
  if (text.kicker) {
    block(text.kicker, roll.not, roll.not.viktStark, t.farg.text2);
    y += t.rum[1];
  }
  block(text.titel, roll.figurtitel, roll.figurtitel.vikt, t.farg.black);
  if (text.undertitel) {
    y += t.rum[1];
    block(text.undertitel, roll.granssnitt, roll.granssnitt.vikt, t.farg.text2);
  }
  y += t.rum[5];
  delar.push(`<g transform="translate(${luft} ${y.toFixed(1)})">${diagram.markup}</g>`);
  y += diagram.hojd;
  if (text.noter.length || text.kalla) y += t.rum[4];
  text.noter.forEach((n, i) => {
    if (i > 0) y += t.rum[1];
    block(n, roll.not, roll.not.vikt, t.farg.text3);
  });
  if (text.kalla) {
    if (text.noter.length) y += t.rum[1];
    block(text.kalla, roll.not, roll.not.vikt, t.farg.text3);
  }
  const hojd = Math.ceil(y + luft);

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${bredd}" height="${hojd}" viewBox="0 0 ${bredd} ${hojd}" role="img">`,
    `<title>${esc(text.kicker ? `${text.kicker}: ${text.titel}` : text.titel)}</title>`,
    text.sammanfattning ? `<desc>${esc(text.sammanfattning)}</desc>` : "",
    typsnitt ? `<defs><style>${typsnitt}</style></defs>` : "",
    `<rect width="${bredd}" height="${hojd}" fill="${t.farg.yta}"/>`,
    ...delar,
    "</svg>",
  ].join("");
  return { svg, bredd, hojd };
}

/** Texterna som bakas in i exporten, ur spec. */
export function exportText(spec: ChartSpec): ExportText {
  const noter = spec.noter.map((n) => n.text.trim()).filter(Boolean);
  return {
    kicker: spec.kicker,
    titel: spec.titel,
    undertitel: spec.undertitel,
    noter: noter.length ? [`Not: ${noter.join(" ")}`] : [],
    kalla: spec.kalla ? `Källa: ${spec.kalla.namn}` : undefined,
    sammanfattning: spec.sammanfattning,
  };
}

// Egenskaper som skrivs in som stil på varje element i den klonade SVG:n.
const STILAR = [
  "fill", "fill-opacity", "stroke", "stroke-width", "stroke-dasharray", "stroke-dashoffset",
  "stroke-linecap", "stroke-linejoin", "stroke-opacity", "opacity", "display",
  "font-family", "font-size", "font-weight", "font-style", "font-variant-numeric",
  "letter-spacing", "text-anchor", "dominant-baseline", "paint-order", "shape-rendering",
] as const;

let matCanvas: HTMLCanvasElement | null = null;
const canvasMatare: Matare = (text, font) => {
  matCanvas ??= document.createElement("canvas");
  const ctx = matCanvas.getContext("2d");
  if (!ctx) return text.length * 8;
  ctx.font = font;
  return ctx.measureText(text).width;
};

/**
 * SVG med titel, undertitel, noter och källa inbakade. `svg` är diagrammets
 * renderade SVG i sidan (klonas, ändras inte). `typsnitt` är @font-face-regler
 * som bäddas in (se typsnittCss); utan dem används de typsnitt som finns där
 * filen öppnas.
 */
export function tillSvg(spec: ChartSpec, svg: SVGSVGElement, typsnitt = ""): string {
  const ruta = svg.getBoundingClientRect();
  const bredd = Math.round(ruta.width) || Number(svg.getAttribute("width")) || 0;
  const hojd = Math.round(ruta.height) || Number(svg.getAttribute("height")) || 0;
  const klon = svg.cloneNode(true) as SVGSVGElement;

  const original = [svg, ...svg.querySelectorAll("*")];
  const kopior = [klon, ...klon.querySelectorAll("*")];
  // Synligheten skrivs bara in där den skiljer sig från rotens: diagrammet kan
  // ligga dolt i sidan (tabellvyn) men ska synas i filen.
  const rotSynlig = getComputedStyle(svg).visibility;
  original.forEach((el, i) => {
    const kopia = kopior[i] as SVGElement | undefined;
    if (!kopia) return;
    const cs = getComputedStyle(el);
    const stilar = STILAR.map((p) => `${p}:${cs.getPropertyValue(p)}`);
    if (cs.visibility !== rotSynlig) stilar.push(`visibility:${cs.visibility}`);
    kopia.setAttribute("style", stilar.join(";"));
    kopia.removeAttribute("class");
    kopia.removeAttribute("tabindex");
  });
  klon.setAttribute("width", String(bredd));
  klon.setAttribute("height", String(hojd));
  if (!klon.getAttribute("viewBox")) klon.setAttribute("viewBox", `0 0 ${bredd} ${hojd}`);
  klon.setAttribute("overflow", "visible");
  klon.removeAttribute("role");
  klon.removeAttribute("aria-label");
  klon.removeAttribute("focusable");

  const markup = new XMLSerializer().serializeToString(klon);
  return byggExportSvg(exportText(spec), { markup, bredd, hojd }, canvasMatare, typsnitt).svg;
}

/** Bredd och höjd ur rotelementets attribut. */
export function svgStorlek(svg: string): { bredd: number; hojd: number } {
  const rot = svg.match(/<svg\b[^>]*>/)?.[0] ?? "";
  const las = (namn: string) => Number(rot.match(new RegExp(`\\s${namn}="([\\d.]+)"`))?.[1] ?? 0);
  return { bredd: las("width"), hojd: las("height") };
}

let typsnittCache: Promise<string> | null = null;

/** @font-face för rapportens sans (latinsk delmängd, variabel vikt) som data-URI. */
export function typsnittCss(): Promise<string> {
  typsnittCache ??= (async () => {
    const svar = await fetch(plexLatin);
    if (!svar.ok) throw new Error(`Kunde inte hämta typsnittet (${svar.status})`);
    const blob = new Blob([await svar.arrayBuffer()], { type: "font/woff2" });
    const dataUrl = await new Promise<string>((los, avvisa) => {
      const r = new FileReader();
      r.onload = () => los(String(r.result));
      r.onerror = () => avvisa(r.error);
      r.readAsDataURL(blob);
    });
    return `@font-face{font-family:${forstaFamilj(tema.typ.familj.sans)};font-style:normal;`
      + `font-weight:100 700;src:url(${dataUrl}) format("woff2");}`;
  })().catch((e) => {
    typsnittCache = null;
    throw e;
  });
  return typsnittCache;
}

// ════════════════════════════════════════════════════════════
//  PNG och sparande
// ════════════════════════════════════════════════════════════

/** PNG ur SVG:n, i dubbel upplösning. */
export async function tillPng(svg: string, bredd: number, hojd: number, skala = 2): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const bild = new Image();
    bild.width = bredd;
    bild.height = hojd;
    await new Promise<void>((los, avvisa) => {
      bild.onload = () => los();
      bild.onerror = () => avvisa(new Error("Kunde inte läsa SVG:n som bild"));
      bild.src = url;
    });
    await bild.decode().catch(() => undefined);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bredd * skala);
    canvas.height = Math.round(hojd * skala);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas saknas");
    ctx.scale(skala, skala);
    ctx.drawImage(bild, 0, 0, bredd, hojd);
    return await new Promise<Blob>((los, avvisa) =>
      canvas.toBlob((b) => (b ? los(b) : avvisa(new Error("Kunde inte skapa PNG"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Sparar en fil via en tillfällig länk med download-attribut. */
export function sparaFil(innehall: Blob, namn: string): void {
  const url = URL.createObjectURL(innehall);
  const a = document.createElement("a");
  a.href = url;
  a.download = namn;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
