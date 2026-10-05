// charts/spec.ts: diagramspecifikationen som alla renderare läser
// (docs/arkitektur.md 4.2). Ägare: WP1. Skapad av WP0 med slutliga typer.
//
// Tillägg i WP1 (valfria fält, bryter inget): `plats` och `platser` på SpecSerie
// och `platsAv` på ChartSpec, så att tooltip och rangordning kan skriva
// "plats r av n" (stilguiden 6.8) utan att renderaren behöver känna till
// indikatorns riktning. Hallands plats följer `rank` i datan, som R räknar på
// oavrundade värden.
//
// Tillägg i WP3 (valfria fält): `jamforNiva` säger vilken nivå de jämförbara
// serierna har, så att figuren skriver "+ Jämför med region" eller "+ Jämför
// med sjukhus" utan att gissa; `period` är rangordningens period (en period,
// som tooltipen skriver i rubriken). Periodtexter i undertitel, noter och
// tabellhuvud har hårt mellanslag (U+00A0) så att "apr 2024" inte bryts.
//
// Tillägg i WP10 (valfritt fält): `borrbar` säger att enheterna i grafen ligger
// under fokus och kan bli fokus (visningarna enheter och enheterRang). I
// enheternas rangordning borrar klick och Enter på en rad då ned i stället för
// att fästa, när figuren ger onFokus; panelerna i små multiplar borrar via namnet.
//
// Så fyller kpiTillSpec serierna per typ:
//   linje         en serie per linje, `punkter` på ett gemensamt periodrutnät
//                 (samma längd i alla serier, luckor som varde: null).
//                 Förväntat intervall är en serie med roll "forvantat" och `intervall`
//                 (lo/hi = 80 %, lo2/hi2 = 95 %); fokusseriens `punkter[].signal`
//                 säger vilka punkter som ligger utanför.
//   rangordning   en serie per rad i ordning bäst till sämst, `varde` och `plats`.
//                 Referensen (riket eller överordnad nivå) har `varde`.
//                 "grans" (topp 3) har `varde` = antal rader ovanför linjen.
//   stapel        fokus med `punkter`.
//   smaMultiplar  en fokusserie per panel (`enhetId` = panelens enhet) och högst en
//                 referens som ritas i alla paneler. y.doman är delad. `paneler`
//                 står i visningsordning: bäst först enligt riktningen.
//   minidiagram   fokus med `punkter`, bara perioder som mättes (en enkät
//                 vartannat år ger inga tomma år).
//
// Tabellen: tal är oformaterade värden i y.format (samma format på båda
// axlarna); perioder, namn, plats och status är text; null = saknas ("–"),
// ".." = undertryckt. Figurens titel är caption, utom för minidiagrammet.

import type { Niva, Not, Punkt, Status, TalFormat, VyId } from "../data/modell";

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
  plats?: number;                              // rangordning: radens plats (lika värden får samma plats)
  platser?: (number | null)[];                 // linje med regioner: plats per punkt, null utan värde
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
  jamforNiva?: { id: Niva; etikett: string };  // de jämförbaras nivå: "+ Jämför med {etikett}" ("region", "sjukhus" …)
  serier: SpecSerie[];
  paneler?: { enhetId: string; titel: string; status?: Status }[];
  x: Axel; y: Axel;
  noter: Not[];
  kalla?: { namn: string; url?: string };
  sammanfattning: string;                      // aria-label, 100–200 tecken
  tabell: { caption: string; kolumner: string[]; rader: (string | number | null)[][]; fokusRad?: number };
  hojdklass: "standard" | "rangordning" | "kompakt" | "minidiagram";
  platsAv?: number[];                          // nämnaren i "plats r av n" per period (rangordning: en period)
  period?: { iso: string; vy: VyId; text: string };   // rangordningens period; text som i undertiteln ("2025", "mar 2026")
  borrbar?: boolean;                           // enheterna (paneler, rader) ligger under fokus och kan bli fokus (WP10)
}

export interface SpecKontext {
  vy: VyId;
  fokus?: string;           // enhet_id; nedborrning byter fokus
  fasta?: string[];         // fästa enheter
  dagar?: boolean;          // dagsdata i stället för perioddata
  fristaende?: boolean;     // ger kicker
}
