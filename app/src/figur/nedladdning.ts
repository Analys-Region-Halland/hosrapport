// figur/nedladdning.ts: CSV, SVG och PNG ur en figur (stilguiden 6.8).
// Ägare: WP4. Stubb från WP0; signaturerna är preliminära.

import type { ChartSpec } from "../charts/spec";

/** Filnamn enligt `{indikator}-{vy}-{period}.{ändelse}`. */
export function filnamn(_spec: ChartSpec, _vy: string, _period: string, _andelse: "csv" | "svg" | "png"): string {
  throw new Error("Ej byggd: WP4");
}

/** CSV med semikolon, decimalkomma och BOM. */
export function tillCsv(_spec: ChartSpec): string {
  throw new Error("Ej byggd: WP4");
}

/** SVG med titel, undertitel och källa inbakade. */
export function tillSvg(_spec: ChartSpec, _svg: SVGSVGElement): string {
  throw new Error("Ej byggd: WP4");
}

/** PNG ur SVG:n. */
export function tillPng(_svg: string, _bredd: number, _hojd: number): Promise<Blob> {
  throw new Error("Ej byggd: WP4");
}
