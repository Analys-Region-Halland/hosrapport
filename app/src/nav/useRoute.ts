// nav/useRoute.ts: aktuell adress och navigering med pushState/replaceState
// (docs/arkitektur.md 4.6). Ägare: WP6.
//
// - Sidbyten (kapitel, vy, sammanfattning, begrepp …) använder pushState, så
//   att bakåt och framåt fungerar.
// - Läspositionen i uppdateras av scroll-spionen (nav/scroll.ts) med fördröjd
//   replaceState: ingen ny historikpost och högst ett anrop per paus i
//   rullningen. Innan en ny post läggs till skrivs den väntande positionen in
//   i den gamla, så att bakåt landar där läsaren var.
// - Bakåt, framåt, uppdatering och vanliga <a href="#/…"> fångas via popstate
//   och hashchange. Adressen skrivs då om till kanonisk form (ogiltiga
//   adresser blir #/, gamla ankare #rapport-{x} blir kapiteladresser).
// - Ett gammalt ankare som inte går att lösa utan data blir väntande
//   (RouteTillstand.ankare); appen slår upp kapitlet och anropar navigera
//   med ersatt.
//
// Lyssnarna installeras först när någon prenumererar, så gamla appen påverkas inte.
//
// Tillägg i WP10: när läspositionen flyttas till ett block med en figur tas
// figurens läge (v, e) med ur registret i nav/figurlage.ts, så att
// uppdatering landar i samma läge som läsaren lämnade figuren i.

import { useSyncExternalStore } from "react";
import { figurlage } from "./figurlage";
import { format, gammaltAnkare, harVy, parse, skrivOmGammalt, START, type Route } from "./route";

export interface RouteTillstand {
  route: Route;
  /** start = sidan laddades; navigering = navigera(); historik = bakåt, framåt eller en vanlig länk. */
  kalla: "start" | "navigering" | "historik";
  /** Ramen ska rulla: till route.i (eller begreppet) om det finns, annars till toppen. */
  rulla: boolean;
  /** Flytta fokus till blocket efter rullningen (uttrycklig navigering i appen). */
  fokus: boolean;
  /** Räknas upp vid varje ändring, så att samma adress två gånger ändå ger en rullning. */
  nr: number;
  /** Gammalt ankare som väntar på att kapitlet slås upp i datan. route är då startsidan. */
  ankare: string | null;
  /** Adressen saknade vy (route.vy är då STANDARDVY). Ett kapitel ska öppnas
   *  enligt KAPITELVY-regeln (nav/route.ts); appen väljer vyn. Tillägg i WP9. */
  utanVy: boolean;
}

export interface NavAlt {
  /** replaceState i stället för pushState. */
  ersatt?: boolean;
  /** Rulla till blocket i (eller till toppen). Förval: sant. */
  rulla?: boolean;
  /** Flytta fokus till blocket. Förval: sant vid push med rullning, annars falskt. */
  fokus?: boolean;
  /** Adressen har ingen egen vy (t.ex. ett gammalt ankare); se RouteTillstand.utanVy. Förval: falskt. */
  utanVy?: boolean;
}

/** navigera(till, { ersatt }). En boolesk andra parameter betyder ersatt (stubbens form). */
export type Navigera = (till: Route, alt?: NavAlt | boolean) => void;

/** Det routern behöver av webbläsaren. Bytbar så att logiken kan testas utan DOM. */
export interface Plats {
  hash(): string;
  push(hash: string): void;
  ersatt(hash: string): void;
  /** Anropar f vid popstate och hashchange. */
  lyssna(f: () => void): void;
}

export interface Router {
  tillstand(): RouteTillstand;
  prenumerera(lyssnare: () => void): () => void;
  navigera: Navigera;
  /** Läspositionen från scroll-spionen. Skrivs med replaceState efter en paus. */
  uppdateraLasposition(i: string | undefined): void;
  /** Skriver en väntande läsposition direkt. */
  skrivLasposition(): void;
  /** Uppslag från block till kapitel för gamla ankare. Returnerar en avregistrering. */
  registreraAnkarUppslag(f: (blockId: string) => string | undefined): () => void;
}

/** Fördröjning innan läspositionen skrivs till adressen, i ms. */
export const LASPOSITION_FORDROJNING = 600;

export function skapaRouter(plats: Plats, fordrojning = LASPOSITION_FORDROJNING): Router {
  let uppslag: ((blockId: string) => string | undefined) | undefined;
  const lyssnare = new Set<() => void>();
  let installerad = false;
  let vantande: { i: string | undefined; timer: ReturnType<typeof setTimeout> } | null = null;

  function tolka(hash: string, aktuell: Route | undefined): { route: Route; ankare: string | null; utanVy: boolean } {
    const g = gammaltAnkare(hash);
    if (g) {
      const r = skrivOmGammalt(g, { aktuell, kapitelFor: uppslag });
      // Ett gammalt ankare inne i ett kapitel behåller kapitlets vy
      const utanVy = aktuell?.sida !== "kapitel";
      return r ? { route: r, ankare: null, utanVy } : { route: START, ankare: g, utanVy };
    }
    return { route: parse(hash), ankare: null, utanVy: !harVy(hash) };
  }

  function las(kalla: RouteTillstand["kalla"], aktuell: Route | undefined, nr: number): RouteTillstand {
    const { route, ankare, utanVy } = tolka(plats.hash(), aktuell);
    return { route, kalla, rulla: true, fokus: false, nr, ankare, utanVy };
  }

  let t = las("start", undefined, 0);
  let kandHash = plats.hash();

  /** Skriver adressen i kanonisk form utan ny historikpost. */
  function kanonisera(): void {
    if (!t.ankare) {
      const k = format(t.route);
      if (k !== plats.hash()) plats.ersatt(k);
    }
    kandHash = plats.hash();
  }

  const meddela = () => lyssnare.forEach((l) => l());

  function avbrytVantande(): void {
    if (vantande) clearTimeout(vantande.timer);
    vantande = null;
  }

  function vidHistorik(): void {
    // popstate och hashchange kommer ofta i par för samma ändring
    if (plats.hash() === kandHash) return;
    avbrytVantande(); // positionen hörde till posten läsaren lämnade
    t = las("historik", t.route, t.nr + 1);
    kanonisera();
    meddela();
  }

  const navigera: Navigera = (till, alt = {}) => {
    const a = typeof alt === "boolean" ? { ersatt: alt } : alt;
    const ersatt = a.ersatt ?? false;
    const rulla = a.rulla ?? true;
    const fokus = a.fokus ?? (!ersatt && rulla);
    if (ersatt) avbrytVantande();
    else skrivLasposition();
    const route = parse(format(till));
    const hash = format(route);
    if (hash !== plats.hash()) {
      if (ersatt) plats.ersatt(hash);
      else plats.push(hash);
    }
    kandHash = plats.hash();
    t = { route, kalla: "navigering", rulla, fokus, nr: t.nr + 1, ankare: null, utanVy: a.utanVy ?? false };
    meddela();
  };

  function skrivLasposition(): void {
    if (!vantande) return;
    const { i } = vantande;
    avbrytVantande();
    const r = t.route;
    if (r.sida !== "kapitel" || r.i === i) return;
    // v och e beskriver figuren i det gamla blocket och följer inte med; det
    // nya blockets figur har sitt eget läge i registret (WP10)
    const lage = figurlage(i);
    navigera({
      sida: "kapitel", id: r.id, vy: r.vy,
      ...(i ? { i } : {}), ...(lage?.v ? { v: lage.v } : {}), ...(lage?.e ? { e: lage.e } : {}),
      ...(r.red ? { red: true } : {}),
    }, { ersatt: true, rulla: false });
  }

  function uppdateraLasposition(i: string | undefined): void {
    const r = t.route;
    if (r.sida !== "kapitel") return;
    const ny = i || undefined;
    avbrytVantande();
    if (r.i === ny) return;
    vantande = { i: ny, timer: setTimeout(skrivLasposition, fordrojning) };
  }

  return {
    tillstand: () => t,
    prenumerera(l) {
      if (!installerad) {
        installerad = true;
        kanonisera();
        plats.lyssna(vidHistorik);
      }
      lyssnare.add(l);
      return () => {
        lyssnare.delete(l);
      };
    },
    navigera,
    uppdateraLasposition,
    skrivLasposition,
    registreraAnkarUppslag(f) {
      uppslag = f;
      // Ett väntande ankare kanske går att lösa nu
      if (t.ankare) {
        const r = skrivOmGammalt(t.ankare, { aktuell: undefined, kapitelFor: f });
        if (r) navigera(r, { ersatt: true, fokus: false, utanVy: true });
      }
      return () => {
        if (uppslag === f) uppslag = undefined;
      };
    },
  };
}

// ════════════════════════════════════════════════════════════
//  Webbläsarens router, skapas vid första användningen
// ════════════════════════════════════════════════════════════

const fonsterPlats: Plats = {
  hash: () => location.hash,
  push: (h) => history.pushState(null, "", h),
  ersatt: (h) => history.replaceState(history.state, "", h),
  lyssna(f) {
    // Ramen rullar själv till läspositionen; webbläsarens egen återställning
    // skulle annars slåss med den vid uppdatering och bakåt.
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    addEventListener("popstate", f);
    addEventListener("hashchange", f);
  },
};

let standardRouter: Router | null = null;

function router(): Router {
  if (!standardRouter) standardRouter = skapaRouter(fonsterPlats);
  return standardRouter;
}

/** Navigerar till en adress. Förval: pushState, rulla till i, flytta fokus dit. */
export const navigera: Navigera = (till, alt) => router().navigera(till, alt);

/** Läspositionen från scroll-spionen; skrivs till adressen med fördröjd replaceState. */
export function uppdateraLasposition(i: string | undefined): void {
  router().uppdateraLasposition(i);
}

/** Uppslag från block till kapitel för gamla ankare (#rapport-{x}). */
export function registreraAnkarUppslag(f: (blockId: string) => string | undefined): () => void {
  return router().registreraAnkarUppslag(f);
}

/** Adressen just nu, utanför React. */
export function aktuellRoute(): Route {
  return router().tillstand().route;
}

const prenumerera = (l: () => void) => router().prenumerera(l);
const tillstand = () => router().tillstand();

/** Hela tillståndet, för ramen (rullning och väntande ankare). */
export function useRouteTillstand(): RouteTillstand {
  return useSyncExternalStore(prenumerera, tillstand, tillstand);
}

/** Aktuell adress och navigera. */
export function useRoute(): [Route, Navigera] {
  return [useRouteTillstand().route, navigera];
}
