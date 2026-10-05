// start/startModell.ts: det startsidan visar, som rena funktioner av manifestet
// (data/laddning.ts) och kapitelinfo (data/kapitelinfo.ts). Ingen DOM, ingen
// React, så att summering och gruppering går att testa. Ägare: WP11.
//
// - Läget just nu: summan av kapitelradernas statusräkning, det vill säga alla
//   indikatorer med status i den vy varje kapitel öppnas i. Mätaren överst är
//   därmed alltid summan av mätarna i förteckningen.
// - Kapitelförteckningen: teman i kapitelinfos ordning, kapitlen i temats
//   ordning. Kapitel i kapitelinfo som saknas i manifestet visas inte; tema utan
//   kapitel visas inte; kapitel i manifestet som saknas i kapitelinfo hamnar i
//   gruppen "Övrigt" sist. Numreringen löper över hela förteckningen (1, 2, 3 …).
// - Varje kapitels siffror hämtas ur den vy kapitlets länk leder till. Det är
//   samma vy som en adress utan vy öppnar (vyForKapitel med KAPITELVY):
//   månadsvyn för akutflödet, årsvyn för SKR-kapitlen. Så visar startsidan
//   aldrig en fördelning som inte finns i kapitlet bakom länken.

import type { RaManifest } from "../data/kontrakt";
import type { KategoriDef, OmradeDef } from "../data/kapitelinfo";
import type { Status, VyId } from "../data/modell";
import { KAPITELVY } from "../nav/route";
import { kapitelIndex, vyForKapitel } from "../rapport/ramData";

/** Antal indikatorer per status. */
export type StatusRakning = Record<Status, number>;

export const STATUSORDNING: readonly Status[] = ["gron", "gul", "rod"];

/** Statusorden med liten bokstav, som i räkneraden ("29 i fas · 20 bevaka"). */
export const STATUSORD: Record<Status, string> = { gron: "i fas", gul: "bevaka", rod: "avvikelse" };

export const TOM_RAKNING: StatusRakning = { gron: 0, gul: 0, rod: 0 };

/** Summerar räkningar. Saknade eller ogiltiga tal räknas som noll. */
export function summeraStatus(rakningar: readonly (Partial<StatusRakning> | null | undefined)[]): StatusRakning {
  const summa = { ...TOM_RAKNING };
  for (const r of rakningar) {
    if (!r) continue;
    for (const s of STATUSORDNING) {
      const n = r[s];
      if (typeof n === "number" && Number.isFinite(n) && n > 0) summa[s] += n;
    }
  }
  return summa;
}

/** Antal indikatorer med status i räkningen. */
export function antalMedStatus(r: StatusRakning): number {
  return r.gron + r.gul + r.rod;
}

/** Första meningen i en text (startsidan visar en mening per tema och kapitel). */
export function forstaMeningen(text: string): string {
  const t = text.trim();
  const m = /^(.+?[.!?])\s+(?=[A-ZÅÄÖ0-9])/s.exec(t);
  return m ? m[1] : t;
}

// Uppdateringstakten som adjektiv i metaraden: "Årsvis" → "årlig".
const TAKT: Record<string, string> = {
  årsvis: "årlig",
  halvårsvis: "halvårsvis",
  kvartalsvis: "kvartalsvis",
  månadsvis: "månatlig",
  veckovis: "veckovis",
  dagligen: "daglig",
};

/** Takten i metaraden: första ordet som adjektiv, resten som det står. "Årsvis (källan månadsvis)" → "årlig (källan månadsvis)". */
export function taktText(takt: string): string {
  const t = takt.trim();
  if (!t) return "";
  const [forsta, ...resten] = t.split(" ");
  const ord = TAKT[forsta.toLowerCase()] ?? forsta.charAt(0).toLowerCase() + forsta.slice(1);
  return [ord, ...resten].join(" ");
}

/** "14 indikatorer", "1 indikator". */
export function antalIndikatorer(n: number): string {
  return `${n} ${n === 1 ? "indikator" : "indikatorer"}`;
}

// ════════════════════════════════════════════════════════════
//  Startsidans modell
// ════════════════════════════════════════════════════════════

export interface StartKapitel {
  id: string;
  /** Löpnummer i förteckningen, 1, 2, 3 … */
  nummer: number;
  namn: string;
  /** Första meningen av kapitelinfos beskrivning; tom för kapitel utan kapitelinfo. */
  dek: string;
  /** Metaradens delar: antal indikatorer, takt, källa. Sätts ihop med " · ". */
  meta: string[];
  notis?: string;
  /** Vyn kapitlets länk leder till och siffrorna hämtas ur. */
  vy: VyId;
  antal: number;
  status: StatusRakning;
}

export interface StartTema {
  id: string;
  namn: string;
  /** Första meningen av temats beskrivning. */
  mening: string;
  kapitel: StartKapitel[];
}

export interface StartModell {
  /** Läget just nu: summan av kapitelradernas räkning. */
  lage: StatusRakning;
  teman: StartTema[];
}

export const OVRIGT_ID = "ovrigt";

const OVRIGT: Pick<StartTema, "id" | "namn" | "mening"> = {
  id: OVRIGT_ID,
  namn: "Övrigt",
  mening: "Kapitel som finns i datan men ännu inte har en plats i rapportens indelning.",
};

/** Bygger startsidan ur manifestet och kapitelinfos teman. */
export function byggStartModell(manifest: RaManifest, teman: readonly KategoriDef[]): StartModell {
  const index = kapitelIndex(manifest);

  // Siffrorna för ett kapitel i den vy dess länk leder till (som en adress utan vy).
  const summering = (id: string) => {
    const vy = vyForKapitel(index, id, KAPITELVY);
    const s = vy ? manifest[vy]?.sektioner.find((x) => x?.id === id) : undefined;
    return vy && s ? { vy, s } : null;
  };

  let nummer = 0;
  const kapitel = (id: string, info?: OmradeDef): StartKapitel | null => {
    const sum = summering(id);
    if (!sum) return null;
    const { vy, s } = sum;
    const antal = typeof s.n_kpier === "number" ? s.n_kpier : 0;
    const meta = [antalIndikatorer(antal)];
    if (info?.takt) meta.push(taktText(info.takt));
    if (info?.kalla) meta.push(info.kalla);
    return {
      id,
      nummer: ++nummer,
      namn: s.namn || info?.namn || id,
      dek: info ? forstaMeningen(info.beskrivning) : "",
      meta,
      ...(info?.notis ? { notis: info.notis } : {}),
      vy,
      antal,
      status: summeraStatus([s.status]),
    };
  };

  const ut: StartTema[] = [];
  const kanda = new Set<string>();
  for (const t of teman) {
    const lista: StartKapitel[] = [];
    for (const o of t.omraden) {
      kanda.add(o.id);
      const k = kapitel(o.id, o);
      if (k) lista.push(k);
    }
    if (lista.length) ut.push({ id: t.id, namn: t.namn, mening: forstaMeningen(t.beskrivning), kapitel: lista });
  }

  const ovriga = index.kapitel
    .filter((k) => !kanda.has(k.id))
    .map((k) => kapitel(k.id))
    .filter((k): k is StartKapitel => k !== null);
  if (ovriga.length) ut.push({ ...OVRIGT, kapitel: ovriga });

  const lage = summeraStatus(ut.flatMap((t) => t.kapitel.map((k) => k.status)));
  return { lage, teman: ut };
}
