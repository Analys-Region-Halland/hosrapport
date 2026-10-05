// charts/register.ts: renderare per diagramtyp (docs/arkitektur.md 4.3).
// Ägare: WP2. Scen, Renderare och RENDERARE är slutliga sedan WP0. WP2 har
// bestämt Lager, Form, Etikett, Stopp och AktivPunkt (tidigare preliminära).
//
// Arbetsdelning:
//   layout()  ren funktion: spec + storlek + tema → Scen med allt färdigräknat
//             (pixlar, färger, etiketter efter kollisionslösning, pekarmål).
//   Rita      ritar Scen som SVG-innehåll. Diagram.tsx äger den yttre <svg>,
//             pekar- och tangenthändelser, tooltip och fästa serier. Rita får
//             `aktiv` och ritar då bara ett överlägg; de statiska lagren är
//             memoiserade på `scen` och ritas aldrig om vid hovring.

import type { ComponentType } from "react";
import type { Tema } from "../design/tema";
import type { ChartSpec, DiagramTyp } from "./spec";
import { linje } from "./typer/linje";
import { rangordning } from "./typer/rangordning";
import { stapel } from "./typer/stapel";
import { smaMultiplar } from "./typer/smaMultiplar";
import { minidiagram } from "./typer/minidiagram";

/**
 * Ritordning: axel (seriebrott), zon, band, kontext, mål, referens, markerad,
 * fokus, punkter. "axel" och "mal" är tillägg i WP2: seriebrottets märke på
 * tidsaxeln och mållinjen (stilguiden 6.4). Zon används inte i linjediagram.
 */
export type LagerId = "axel" | "zon" | "band" | "kontext" | "mal" | "referens" | "markerad" | "fokus" | "punkter";

/**
 * En färdigräknad ritform. Färger är redan hämtade ur tema, mått i px.
 * `streck` är stroke-dasharray (null = heldragen).
 */
export type Form =
  | { typ: "linje"; serieId: string; d: string; farg: string; bredd: number; streck: string | null }
  | { typ: "yta"; serieId: string; d: string; farg: string }
  | { typ: "punkt"; serieId: string; x: number; y: number; r: number; farg: string }
  | { typ: "markor"; serieId: string; form: "upp" | "ned" | "romb"; x: number; y: number; storlek: number; farg: string }
  | { typ: "streck"; x1: number; y1: number; x2: number; y2: number; farg: string; bredd: number; streck: string | null }
  | {
      typ: "text"; serieId?: string; x: number; y: number; text: string; farg: string;
      vikt: number; storlek: number; ankare: "start" | "middle" | "end"; halo: boolean;
    };

/** Ett statiskt ritlager. */
export interface Lager {
  id: LagerId;
  serieIds: string[];
  former: Form[];
}

/** En färdigplacerad etikett i etikettkolumnen till höger om sista perioden. */
export interface Etikett {
  serieId: string;
  text: string;             // ev. kortad med ellips
  helText: string;          // okortat namn
  x: number;                // textens vänsterkant
  y: number;                // textens mittlinje efter kollisionslösning
  textbredd: number;        // uppmätt bredd, för pekarytan
  ankarX: number;           // kopplingslinjens början (strax höger om sista perioden)
  ankarY: number;           // linjeslutets y, för kopplingslinjen
  farg: string;
  vikt: number;
  interaktiv: boolean;      // klick fäster eller tar bort serien
}

/** Pekar- och tangentbordsmål per period och serie: en definierad punkt. */
export interface Stopp {
  serieId: string;
  index: number;            // periodindex i tidsaxeln
  x: number;
  y: number;
  varde: number;
}

/** Den period och serie som är aktiv under pekaren eller tangentbordet. */
export interface AktivPunkt {
  index: number;
  serieId: string | null;   // lyft serie, null = bara perioden
}

export interface Scen {
  bredd: number; hojd: number;
  plot: { x: number; y: number; b: number; h: number };
  xTicks: { v: number | string; x: number; text: string }[];
  yTicks: { v: number; y: number; text: string }[];
  lager: Lager[];             // ritordning: se LagerId (karna/former.tsx: LAGERORDNING)
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
