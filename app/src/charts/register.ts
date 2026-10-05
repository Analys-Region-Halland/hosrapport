// charts/register.ts: renderare per diagramtyp (docs/arkitektur.md 4.3).
// Ägare: WP2. Skapad av WP0: varje DiagramTyp pekar på en stubbrenderare i
// typer/*.tsx som WP2 (linje) och WP3 (övriga) ersätter. Scen, Renderare och
// RENDERARE är slutliga; Lager, Etikett, Stopp och AktivPunkt är preliminära
// tills WP2 bestämt dem.

import type { ComponentType } from "react";
import type { Tema } from "../design/tema";
import type { ChartSpec, DiagramTyp } from "./spec";
import { linje } from "./typer/linje";
import { rangordning } from "./typer/rangordning";
import { stapel } from "./typer/stapel";
import { smaMultiplar } from "./typer/smaMultiplar";
import { minidiagram } from "./typer/minidiagram";

/** Ritordning: zon, band, kontext, referens, markerad, fokus, punkter. */
export type LagerId = "zon" | "band" | "kontext" | "referens" | "markerad" | "fokus" | "punkter";

/** Ett statiskt ritlager. Preliminär form (WP2). */
export interface Lager {
  id: LagerId;
  serieIds: string[];
}

/** En färdigplacerad etikett vid linjeslutet. Preliminär form (WP2). */
export interface Etikett {
  serieId: string;
  text: string;
  x: number;
  y: number;
  ankarY: number;           // linjeslutets y, för kopplingslinjen
}

/** Pekar- och tangentbordsmål per period och serie. Preliminär form (WP2). */
export interface Stopp {
  serieId: string;
  index: number;            // periodindex
  x: number;
  y: number;
}

/** Den period och serie som är aktiv under pekaren eller tangentbordet. Preliminär form (WP2). */
export interface AktivPunkt {
  index: number;
  serieId: string | null;   // lyft serie, null = bara perioden
}

export interface Scen {
  bredd: number; hojd: number;
  plot: { x: number; y: number; b: number; h: number };
  xTicks: { v: number | string; x: number; text: string }[];
  yTicks: { v: number; y: number; text: string }[];
  lager: Lager[];             // ritordning: zon, band, kontext, referens, markerad, fokus, punkter
  etiketter: Etikett[];       // färdigplacerade efter kollisionslösning
  stopp: Stopp[];             // pekar- och tangentbordsmål per period och serie
}

export interface Renderare {
  typ: DiagramTyp;
  minstaBredd: number;
  hojd(bredd: number, spec: ChartSpec): number;
  layout(spec: ChartSpec, storlek: { bredd: number; hojd: number }, tema: Tema): Scen;   // ren funktion
  Rita: ComponentType<{ scen: Scen; spec: ChartSpec; aktiv: AktivPunkt | null; fasta: string[] }>;
}

export const RENDERARE: Record<DiagramTyp, Renderare> = {
  linje,
  rangordning,
  stapel,
  smaMultiplar,
  minidiagram,
};
