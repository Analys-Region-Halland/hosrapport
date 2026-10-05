// format.ts: svensk formatering av tal, enheter och perioder enligt
// stilguiden 3.2 (Myndigheternas skrivregler). Ersätter utils/format.ts när
// gamla vyn raderas (WP12b). Ägare: WP0.
//
// Två lägen där reglerna skiljer sig:
//   "tabell"  tabeller, diagram, nyckeltal: minus U+2212, "p.e.", förkortade perioder
//   "lopande" löptext: bindestreck som minus, "procentenheter", utskrivna perioder

import type { TalFormat, VyId } from "../data/modell";

/** Hårt mellanslag (U+00A0): tusental, före % och enheter. */
export const HART = String.fromCharCode(0x00a0);
/** Typografiskt minus (U+2212) för tabeller och diagram. */
export const MINUS = String.fromCharCode(0x2212);
/** Kort tankstreck (U+2013): intervall och "saknas". */
export const DASH = String.fromCharCode(0x2013);
/** Saknat värde. */
export const SAKNAS = DASH;
/** För osäkert eller dolt på grund av få fall. */
export const UNDERTRYCKT = "..";

export type Lage = "tabell" | "lopande";

/** Antal decimaler per enhet (stilguiden 3.2). */
export const STANDARD_DECIMALER: Record<TalFormat["enhet"], number> = {
  procent: 1,
  minuter: 0,
  antal: 0,
  kronor: 0,
  kvot: 1,
  per_invanare: 1,
};

const avrunda = (v: number, decimaler: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimaler,
    maximumFractionDigits: decimaler,
    useGrouping: false,
  }).format(v);

/**
 * Tal med tusentalsavgränsare (hårt mellanslag), decimalkomma och minus.
 * `tal(-12345.678, 1)` → "−12 345,7"; i löptext "-12 345,7".
 */
export function tal(v: number, decimaler = 0, lage: Lage = "tabell"): string {
  if (!Number.isFinite(v)) return SAKNAS;
  let s = avrunda(Math.abs(v), decimaler);
  const negativ = v < 0 && /[1-9]/.test(s); // -0,0 skrivs 0,0
  const [heltal, decimal] = s.split(".");
  const grupperat = heltal.replace(/\B(?=(\d{3})+(?!\d))/g, HART);
  s = decimal !== undefined ? `${grupperat},${decimal}` : grupperat;
  return negativ ? (lage === "tabell" ? MINUS : "-") + s : s;
}

/** Procent med hårt mellanslag före %: "87,7 %". */
export function procent(v: number, decimaler = STANDARD_DECIMALER.procent, lage: Lage = "tabell"): string {
  return `${tal(v, decimaler, lage)}${HART}%`;
}

/** Skillnad i procentenheter: "2,1 p.e." i tabell, "2,1 procentenheter" i löptext. */
export function procentenheter(v: number, decimaler = 1, lage: Lage = "tabell"): string {
  return `${tal(v, decimaler, lage)}${HART}${lage === "tabell" ? "p.e." : "procentenheter"}`;
}

/** Kronor: "45 300 kr". */
export function kronor(v: number, decimaler = STANDARD_DECIMALER.kronor, lage: Lage = "tabell"): string {
  return `${tal(v, decimaler, lage)}${HART}kr`;
}

/** Minuter: "45 min". */
export function minuter(v: number, decimaler = STANDARD_DECIMALER.minuter, lage: Lage = "tabell"): string {
  return `${tal(v, decimaler, lage)}${HART}min`;
}

/** Per invånare: "12,3 per 100 000 inv." i etiketter, "… invånare" i undertitel och löptext. */
export function perInvanare(v: number, decimaler = STANDARD_DECIMALER.per_invanare, lage: Lage = "tabell", bas = 100_000): string {
  const enhet = lage === "tabell" ? "inv." : "invånare";
  return `${tal(v, decimaler, lage)}${HART}per${HART}${tal(bas)}${HART}${enhet}`;
}

/**
 * Ett värde i en indikators format. `null` blir "–"; `undertryckt` blir "..".
 * Kvoter och antal får ingen enhet (den står i undertiteln).
 */
export function varde(
  v: number | null | undefined,
  format: Pick<TalFormat, "enhet"> & { decimaler?: number },
  lage: Lage = "tabell",
  undertryckt = false,
): string {
  if (undertryckt) return UNDERTRYCKT;
  if (v === null || v === undefined || !Number.isFinite(v)) return SAKNAS;
  const d = format.decimaler ?? STANDARD_DECIMALER[format.enhet];
  switch (format.enhet) {
    case "procent": return procent(v, d, lage);
    case "kronor": return kronor(v, d, lage);
    case "minuter": return minuter(v, d, lage);
    case "per_invanare": return perInvanare(v, d, lage);
    case "antal":
    case "kvot": return tal(v, d, lage);
  }
}

/** Intervall med kort tankstreck utan mellanslag: "2016–2025", "plats 4–7". */
export function intervall(fran: string | number, till: string | number): string {
  return `${fran}${DASH}${till}`;
}

/** Plats bland regionerna: "plats 8 av 21". */
export function plats(rank: number, av: number): string {
  return `plats${HART}${rank} av${HART}${av}`;
}

const TAL_ORD = ["noll", "ett", "två", "tre", "fyra", "fem", "sex", "sju", "åtta", "nio", "tio", "elva", "tolv"];

/** Antal i löptext: ett till tolv med bokstäver, annars siffror ("tre", "14"). */
export function antalILoptext(n: number): string {
  return Number.isInteger(n) && n >= 1 && n <= 12 ? TAL_ORD[n] : tal(n, 0, "lopande");
}

// ── Datum och perioder ──

export const MANADER = ["januari", "februari", "mars", "april", "maj", "juni", "juli",
  "augusti", "september", "oktober", "november", "december"] as const;
export const MANADER_KORT = ["jan", "feb", "mar", "apr", "maj", "jun", "jul",
  "aug", "sep", "okt", "nov", "dec"] as const;

/** Läser "2026-03-01" som ett kalenderdatum (UTC, utan tidszonsförskjutning). */
function lasDatum(iso: string): Date {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(a, (m || 1) - 1, d || 1));
}

/** ISO-veckonummer och veckans år. */
export function isoVecka(iso: string): { vecka: number; ar: number } {
  const torsdag = (d: Date) => {
    const t = new Date(d);
    t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7) + 3); // måndag = 0
    return t;
  };
  const t = torsdag(lasDatum(iso));
  const ar = t.getUTCFullYear();
  const forsta = torsdag(new Date(Date.UTC(ar, 0, 4))); // 4 januari ligger alltid i vecka 1
  return { vecka: 1 + Math.round((t.getTime() - forsta.getTime()) / (7 * 86_400_000)), ar };
}

/** Datum i löptext: "5 oktober 2026". Kort: "5 okt 2026". */
export function datum(iso: string, kort = false): string {
  const d = lasDatum(iso);
  const m = (kort ? MANADER_KORT : MANADER)[d.getUTCMonth()];
  return `${d.getUTCDate()} ${m} ${d.getUTCFullYear()}`;
}

/**
 * En period som text.
 *   "axel"    diagramaxlar och tooltip: 2025, mar 26, kv. 1 26, v. 12, 1 mar
 *   "kort"    undertitlar, tabeller och intervall: 2025, mar 2026, kv. 1 2026, v. 12 2026, 1 mar 2026
 *   "lopande" löptext: 2025, mars 2026, kvartal 1 2026, vecka 12, 1 mars 2026
 * `iso` är periodens första dag.
 */
export function period(iso: string, vy: VyId, stil: "axel" | "kort" | "lopande" = "axel"): string {
  const d = lasDatum(iso);
  const ar = d.getUTCFullYear();
  const ar2 = String(ar % 100).padStart(2, "0");
  const m = d.getUTCMonth();
  switch (vy) {
    case "ar":
      return String(ar);
    case "manad":
      return stil === "lopande" ? `${MANADER[m]} ${ar}` : `${MANADER_KORT[m]} ${stil === "axel" ? ar2 : ar}`;
    case "kvartal": {
      const k = Math.floor(m / 3) + 1;
      if (stil === "lopande") return `kvartal ${k} ${ar}`;
      return `kv.${HART}${k} ${stil === "axel" ? ar2 : ar}`;
    }
    case "vecka": {
      const v = isoVecka(iso);
      if (stil === "lopande") return `vecka ${v.vecka}`;
      return stil === "axel" ? `v.${HART}${v.vecka}` : `v.${HART}${v.vecka} ${v.ar}`;
    }
    case "dag": {
      const dag = d.getUTCDate();
      if (stil === "lopande") return `${dag} ${MANADER[m]} ${ar}`;
      return stil === "axel" ? `${dag} ${MANADER_KORT[m]}` : `${dag} ${MANADER_KORT[m]} ${ar}`;
    }
  }
}

/** Periodintervall: "2016–2025", "jan 2021–mar 2026". Samma period ger en period. */
export function periodIntervall(fran: string, till: string, vy: VyId, stil: "kort" | "lopande" = "kort"): string {
  const a = period(fran, vy, stil);
  const b = period(till, vy, stil);
  return a === b ? a : intervall(a, b);
}
