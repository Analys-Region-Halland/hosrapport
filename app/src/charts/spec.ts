// charts/spec.ts: diagramspecifikationen som alla renderare läser
// (docs/arkitektur.md 4.2). Ägare: WP1. Skapad av WP0 med slutliga typer.

import type { Not, Punkt, Status, TalFormat, VyId } from "../data/modell";

export type DiagramTyp = "linje" | "rangordning" | "stapel" | "smaMultiplar" | "minidiagram";
export type SerieRoll = "fokus" | "referens" | "kontext" | "markerad" | "forvantat" | "grans" | "mal";
export type VisningId = "tid" | "rang" | "enheter" | "enheterRang";

export interface SpecSerie {
  id: string; namn: string; roll: SerieRoll;
  enhetId?: string; markeringIndex?: number;   // index i farg.diagram.markering
  punkter?: Punkt[];
  intervall?: { x: string; lo: number; hi: number; lo2?: number; hi2?: number }[];
  varde?: number;                              // för rangordning och mål
  interaktiv?: boolean;                        // får lyftas och fästas
}

export interface Axel {
  typ: "tid" | "kategori" | "linjar";
  doman?: [number, number];                    // delad domän för små multiplar
  noll: boolean;
  format: TalFormat;
}

export interface ChartSpec {
  id: string;
  typ: DiagramTyp;
  kicker?: string;                             // indikatornamn, bara fristående
  titel: string;                               // stilguiden 6.2
  undertitel: string;                          // ≤ 2 meningar
  etiketter: { serieId: string; text: string }[];   // vilka serier som får namn vid linjeslut (stilguiden 6.4); inga legender
  jamforbara?: { enhetId: string; namn: string; senaste: number | null }[];   // underlag för "+ Jämför med …"
  serier: SpecSerie[];
  paneler?: { enhetId: string; titel: string; status?: Status }[];
  x: Axel; y: Axel;
  noter: Not[];
  kalla?: { namn: string; url?: string };
  sammanfattning: string;                      // aria-label, 100–200 tecken
  tabell: { caption: string; kolumner: string[]; rader: (string | number | null)[][]; fokusRad?: number };
  hojdklass: "standard" | "rangordning" | "kompakt" | "minidiagram";
}

export interface SpecKontext {
  vy: VyId;
  fokus?: string;           // enhet_id; nedborrning byter fokus
  fasta?: string[];         // fästa enheter
  dagar?: boolean;          // dagsdata i stället för perioddata
  fristaende?: boolean;     // ger kicker
}
