// nav/route.ts: rapportens adresser (docs/arkitektur.md 4.6). parse och format
// är rena funktioner utan DOM. Ägare: WP6.
//
// Grammatik (allt efter # i adressen):
//   /                                         startsidan
//   /sammanfattning?vy={vy}                   sammanfattningen
//   /kapitel/{id}?vy={vy}&i={block}&v={visning}&e={enhet}&red=1
//                                             kapitlet, rullat till blocket i
//   /begrepp  ·  /begrepp/{id}                begreppslistan
//   /las                                      så läser du rapporten
//   rapport-{x}                               gammalt ankare, skrivs om (skrivOmGammalt)
// Allt annat (okänd sökväg, för många led, trasig kodning) blir startsidan.
// Ogiltiga parametrar tas bort: okänd vy blir STANDARDVY, okänd visning och
// red≠1 faller bort. format skriver alltid vy och parametrarna i fast ordning
// (vy, i, v, e, red), så att format(parse(x)) ger en kanonisk adress.

import type { VisningId } from "../charts/spec";
import type { VyId } from "../data/modell";

export type Route =
  | { sida: "start" }
  | { sida: "sammanfattning"; vy: VyId }
  | { sida: "kapitel"; id: string; vy: VyId; i?: string; v?: VisningId; e?: string; red?: boolean }
  | { sida: "begrepp"; id?: string }
  | { sida: "las" };

/** Tidsupplösningarna i rapportens ordning, kortast först. */
export const VYER: readonly VyId[] = ["dag", "vecka", "manad", "kvartal", "ar"];

/** Vy när adressen saknar vy eller har en ogiltig. Alla kapitel finns i årsvyn.
 *  Sammanfattningen öppnas här (vyn med flest kapitel). Kapitel öppnas enligt
 *  KAPITELVY när adressen saknar vy. */
export const STANDARDVY: VyId = "ar";

/**
 * Vyn ett kapitel öppnas i när adressen saknar vy (regeln i gamla
 * utils/vyval.ts): månadsvyn om kapitlet finns där, annars en vy som har
 * kapitlet. parse kan inte välja, eftersom det kräver manifestet; routern
 * säger därför om adressen saknade vy (RouteTillstand.utanVy) och appen väljer
 * med rapport/ramData.ts vyForKapitel(index, id, KAPITELVY).
 */
export const KAPITELVY: VyId = "manad";

export const VISNINGAR: readonly VisningId[] = ["tid", "rang", "enheter", "enheterRang"];

export const START: Route = { sida: "start" };

/** Block på kapitelnivå som varken är avsnitt eller indikatorer. Rapportsidan
 *  (WP9) sätter data-block till dessa id:n; avsnitt och indikatorer har sina
 *  egna id:n ur KapitelModell. */
export const KAPITELBLOCK = {
  viktigast: "det-viktigaste",
  laget: "laget-i-korthet",
  om: "om-statistiken",
} as const;

// Gamla rapportvyns block som heter något annat i den nya.
const GAMLA_BLOCK: Record<string, string> = {
  oversikt: KAPITELBLOCK.laget,
  kallor: KAPITELBLOCK.om,
};

export function arVy(x: unknown): x is VyId {
  return typeof x === "string" && (VYER as readonly string[]).includes(x);
}

function arVisning(x: unknown): x is VisningId {
  return typeof x === "string" && (VISNINGAR as readonly string[]).includes(x);
}

function avkoda(s: string): string | null {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
}

const kod = encodeURIComponent;

// ════════════════════════════════════════════════════════════
//  Gamla ankare (#rapport-{x}) från den gamla rapportvyn
// ════════════════════════════════════════════════════════════

/** Blockets id om hashen är ett gammalt ankare (#rapport-{x}), annars null. */
export function gammaltAnkare(hash: string): string | null {
  const m = /^#?rapport-(.+)$/.exec(hash.trim());
  return m ? avkoda(m[1]) || null : null;
}

export interface AnkarKontext {
  /** Adressen läsaren står på när ankaret följs (gamla länkar inne i ett kapitel). */
  aktuell?: Route;
  /** Slår upp vilket kapitel ett block hör till. Ett kapitels eget id ger kapitlet. */
  kapitelFor?(blockId: string): string | undefined;
}

/**
 * Skriver om ett gammalt ankare till en ny adress. Ordning:
 * 1. blocket är ett kapitel (gamla helhetsvyn hade kapitlen som block): kapitlet;
 * 2. uppslaget känner blocket: dess kapitel, rullat till blocket;
 * 3. läsaren står i ett kapitel: samma kapitel, rullat till blocket;
 * 4. gamla helhetsvyns översikt: sammanfattningen.
 * Annars null: kapitlet måste slås upp i datan (asynkront, i appen).
 */
export function skrivOmGammalt(blockId: string, ktx: AnkarKontext = {}): Route | null {
  const akt = ktx.aktuell;
  const vy: VyId = akt && "vy" in akt ? akt.vy : STANDARDVY;
  const block = GAMLA_BLOCK[blockId] ?? blockId;
  const iSammaKapitel = (id: string) => akt?.sida === "kapitel" && akt.id === id;
  const red = (id: string) => (iSammaKapitel(id) && akt?.sida === "kapitel" && akt.red ? { red: true } : {});

  const kap = ktx.kapitelFor?.(blockId);
  if (kap && kap === blockId) return { sida: "kapitel", id: kap, vy };
  if (kap) return { sida: "kapitel", id: kap, vy, i: block, ...red(kap) };
  if (akt?.sida === "kapitel") return { sida: "kapitel", id: akt.id, vy: akt.vy, i: block, ...red(akt.id) };
  if (blockId === "oversikt") return { sida: "sammanfattning", vy };
  return null;
}

// ════════════════════════════════════════════════════════════
//  parse och format
// ════════════════════════════════════════════════════════════

/**
 * Sant när adressen bestämmer vyn själv: en giltig vy-parameter. Gamla ankare
 * har ingen vy (de ärver den aktuella sidans vy om läsaren står i ett kapitel,
 * vilket routern hanterar). Används för KAPITELVY-regeln.
 */
export function harVy(hash: string): boolean {
  const s = hash.trim();
  const q = s.indexOf("?");
  return q >= 0 && arVy(new URLSearchParams(s.slice(q + 1)).get("vy"));
}

/** Tolkar location.hash. Gamla ankare (#rapport-{x}) skrivs om enligt
 *  skrivOmGammalt; går de inte att lösa utan data blir svaret startsidan. */
export function parse(hash: string, ktx?: AnkarKontext): Route {
  const h = hash.trim();
  const gammalt = gammaltAnkare(h);
  if (gammalt) return skrivOmGammalt(gammalt, ktx) ?? START;

  const s = h.startsWith("#") ? h.slice(1) : h;
  if (!s.startsWith("/")) return START;

  const q = s.indexOf("?");
  const vag = q >= 0 ? s.slice(0, q) : s;
  const fraga = new URLSearchParams(q >= 0 ? s.slice(q + 1) : "");
  const delar: string[] = [];
  for (const d of vag.split("/")) {
    if (d === "") continue;
    const x = avkoda(d);
    if (!x) return START;
    delar.push(x);
  }

  const vyParam = fraga.get("vy");
  const vy: VyId = arVy(vyParam) ? vyParam : STANDARDVY;

  switch (delar[0]) {
    case undefined:
      return START;
    case "sammanfattning":
      return delar.length === 1 ? { sida: "sammanfattning", vy } : START;
    case "kapitel": {
      if (delar.length !== 2) return START;
      const r: Route = { sida: "kapitel", id: delar[1], vy };
      const i = fraga.get("i");
      const v = fraga.get("v");
      const e = fraga.get("e");
      if (i) r.i = i;
      if (arVisning(v)) r.v = v;
      if (e) r.e = e;
      if (fraga.get("red") === "1") r.red = true;
      return r;
    }
    case "begrepp":
      if (delar.length === 1) return { sida: "begrepp" };
      return delar.length === 2 ? { sida: "begrepp", id: delar[1] } : START;
    case "las":
      return delar.length === 1 ? { sida: "las" } : START;
    default:
      return START;
  }
}

/** Bygger hash för en adress, t.ex. "#/kapitel/skr-tillganglighet?vy=ar&i=x". */
export function format(route: Route): string {
  switch (route.sida) {
    case "start":
      return "#/";
    case "sammanfattning":
      return `#/sammanfattning?vy=${route.vy}`;
    case "kapitel": {
      const p = [`vy=${route.vy}`];
      if (route.i) p.push(`i=${kod(route.i)}`);
      if (route.v) p.push(`v=${route.v}`);
      if (route.e) p.push(`e=${kod(route.e)}`);
      if (route.red) p.push("red=1");
      return `#/kapitel/${kod(route.id)}?${p.join("&")}`;
    }
    case "begrepp":
      return route.id ? `#/begrepp/${kod(route.id)}` : "#/begrepp";
    case "las":
      return "#/las";
  }
}

/** Samma adress efter kanonisering. */
export function lika(a: Route, b: Route): boolean {
  return format(a) === format(b);
}

/** Samma sida: samma sidtyp, kapitel, vy och begrepp. Läsposition,
 *  figurläge och redigeringsläge räknas inte. */
export function sammaSida(a: Route, b: Route): boolean {
  if (a.sida === "kapitel" && b.sida === "kapitel") return a.id === b.id && a.vy === b.vy;
  if (a.sida === "sammanfattning" && b.sida === "sammanfattning") return a.vy === b.vy;
  if (a.sida === "begrepp" && b.sida === "begrepp") return a.id === b.id;
  return a.sida === b.sida;
}
