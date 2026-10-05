// nav/scroll.ts: läsposition och rullning (docs/arkitektur.md 4.6). Ägare: WP6.
//
// - rullaTillBlock: efter document.fonts.ready rullas [data-block="{i}"] upp
//   under verktygsraden. Avståndet är blockets scroll-margin-top, som ramen
//   sätter till verktygsradens höjd + rum.5 (Ram.module.css). Sidan hålls kvar
//   på blocket en kort stund om innehållet ovanför ändrar höjd (sena typsnitt,
//   figurer som monteras), tills läsaren själv rör sidan.
// - Scroll-spionen: blocket vars överkant passerat läslinjen är aktivt. Det
//   styr innehållsförteckningen och positionsraden direkt och läspositionen i
//   adressen med fördröjning (nav/useRoute.ts). Ingen nedtoning av andra block.
// - useLasposition knyter ihop dem med routern: vid varje navigering rullas
//   sidan en gång när innehållet är laddat, och spionen pausas tills dess så
//   att gamla block aldrig skrivs in i en ny adress.

import { useEffect, useRef, useSyncExternalStore } from "react";
import { tema } from "../design/tema";
import { sammaSida, type Route } from "./route";
import { uppdateraLasposition, type RouteTillstand } from "./useRoute";

/** Avståndet från fönstrets överkant till ett block man rullat till: verktygsraden + rum.5. */
export const RULLMARGINAL = tema.matt.verktygsrad + tema.rum[5];

/** Läslinjen: ett block är aktivt när dess överkant passerat hit. En bit under
 *  rullmarginalen, så att blocket man rullat till alltid räknas som aktivt. */
export const LASLINJE = RULLMARGINAL + tema.rum[5];

// ════════════════════════════════════════════════════════════
//  Aktivt block (för innehållsförteckning och positionsrad)
// ════════════════════════════════════════════════════════════

let aktivt = "";
const lyssnare = new Set<() => void>();

/** Sätter aktivt block ("" = ovanför första blocket). */
export function sattAktivtBlock(id: string): void {
  if (id === aktivt) return;
  aktivt = id;
  lyssnare.forEach((l) => l());
}

export function aktivtBlock(): string {
  return aktivt;
}

function prenumerera(l: () => void): () => void {
  lyssnare.add(l);
  return () => {
    lyssnare.delete(l);
  };
}

/** Blocket läsaren är i just nu. Uppdateras per bildruta under rullning. */
export function useAktivtBlock(): string {
  return useSyncExternalStore(prenumerera, aktivtBlock, aktivtBlock);
}

// ════════════════════════════════════════════════════════════
//  Vilket block är aktivt (ren funktion)
// ════════════════════════════════════════════════════════════

export interface BlockLage {
  id: string;
  /** Överkant relativt fönstret, px. */
  topp: number;
  /** Falskt för block utan layout (display: none). */
  synlig: boolean;
}

/**
 * Sista blocket i dokumentordning vars överkant passerat läslinjen. När sidan
 * är rullad ända till slutet räcker det att överkanten syns, så att korta block
 * sist i kapitlet också kan bli aktiva. Blocken kommer i dokumentordning;
 * nästlade block (indikator i avsnitt) fungerar eftersom barnet kommer efter
 * föräldern och ligger lägre.
 */
export function valjAktivt(block: BlockLage[], linje: number, slut?: { fonsterhojd: number }): string {
  let id = "";
  for (const b of block) {
    if (!b.synlig) continue;
    if (b.topp <= linje || (slut && b.topp < slut.fonsterhojd)) id = b.id;
    else if (!slut) break;
  }
  return id;
}

// Senaste rullningen ramen själv gjorde. Så länge sidan står kvar där är det
// blocket aktivt, även om ett kort block följs av ett annat ovanför läslinjen.
let mal: { id: string; y: number } | null = null;

function matAktivt(): string {
  if (mal && Math.abs(scrollY - mal.y) < 2) return mal.id;
  mal = null;
  const block = Array.from(document.querySelectorAll<HTMLElement>("[data-block]"), (el) => ({
    id: el.dataset.block ?? "",
    topp: el.getBoundingClientRect().top,
    synlig: el.getClientRects().length > 0,
  }));
  const rot = document.documentElement;
  const vidSlut = scrollY > 0 && scrollY + innerHeight >= rot.scrollHeight - 2;
  return valjAktivt(block, LASLINJE, vidSlut ? { fonsterhojd: innerHeight } : undefined);
}

/** Startar scroll-spionen. onAktiv anropas högst en gång per bildruta. Returnerar stopp. */
export function startaSpaning(onAktiv: (id: string) => void): () => void {
  let bild = 0;
  const mat = () => {
    bild = 0;
    onAktiv(matAktivt());
  };
  const vid = () => {
    if (!bild) bild = requestAnimationFrame(mat);
  };
  addEventListener("scroll", vid, { passive: true });
  addEventListener("resize", vid);
  return () => {
    removeEventListener("scroll", vid);
    removeEventListener("resize", vid);
    if (bild) cancelAnimationFrame(bild);
  };
}

// ════════════════════════════════════════════════════════════
//  Rulla till ett block
// ════════════════════════════════════════════════════════════

const tvaBilder = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

function vantaPaElement(selektor: string, ms: number): Promise<HTMLElement | null> {
  const finns = document.querySelector<HTMLElement>(selektor);
  if (finns) return Promise.resolve(finns);
  return new Promise((los) => {
    const obs = new MutationObserver(() => {
      const el = document.querySelector<HTMLElement>(selektor);
      if (el) klar(el);
    });
    const timer = setTimeout(() => klar(null), ms);
    function klar(el: HTMLElement | null) {
      obs.disconnect();
      clearTimeout(timer);
      los(el);
    }
    obs.observe(document.body, { childList: true, subtree: true });
  });
}

const INMATNING = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

// Varje rullning får ett nummer. En ny rullning (eller avbrytRullning) gör att
// en äldre som fortfarande väntar på typsnitt eller block inte rullar, och att
// en äldre som håller kvar sin position släpper.
let rullningNr = 0;
let slutaHalla: (() => void) | null = null;

/** Avbryter pågående rullning och kvarhållning. */
export function avbrytRullning(): void {
  rullningNr++;
  slutaHalla?.();
}

/** Håller blocket kvar under verktygsraden en kort stund medan sidan sätter sig. */
function hallKvar(el: HTMLElement, id: string, ms = 1500): void {
  const slut = performance.now() + ms;
  let timer = 0;
  const sluta = () => {
    clearTimeout(timer);
    INMATNING.forEach((h) => removeEventListener(h, sluta, true));
    if (slutaHalla === sluta) slutaHalla = null;
  };
  slutaHalla = sluta;
  INMATNING.forEach((h) => addEventListener(h, sluta, { capture: true, passive: true }));
  const steg = () => {
    if (performance.now() > slut || !el.isConnected) return sluta();
    const forvantad = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    if (Math.abs(el.getBoundingClientRect().top - forvantad) > 2) {
      el.scrollIntoView({ block: "start", behavior: "instant" });
      mal = { id, y: scrollY };
    }
    timer = window.setTimeout(steg, 100);
  };
  timer = window.setTimeout(steg, 100);
}

/**
 * Rullar till [data-block="{blockId}"] efter document.fonts.ready. Väntar upp
 * till `vanta` ms på att blocket finns. Med fokus flyttas tangentbordsfokus
 * till blocket (tabindex -1). Sant om blocket hittades och ingen senare
 * rullning hann före.
 */
export async function rullaTillBlock(blockId: string, alt: { fokus?: boolean; vanta?: number } = {}): Promise<boolean> {
  if (typeof document === "undefined") return false;
  avbrytRullning();
  const nr = rullningNr;
  await document.fonts.ready;
  const el = await vantaPaElement(`[data-block="${CSS.escape(blockId)}"]`, alt.vanta ?? 5000);
  if (!el || nr !== rullningNr) return false;
  await tvaBilder();
  if (!el.isConnected || nr !== rullningNr) return false;
  el.scrollIntoView({ block: "start", behavior: "instant" });
  mal = { id: blockId, y: scrollY };
  sattAktivtBlock(blockId);
  if (alt.fokus) {
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  }
  hallKvar(el, blockId);
  return true;
}

// ════════════════════════════════════════════════════════════
//  Läsposition knuten till routern
// ════════════════════════════════════════════════════════════

/** Blocket en adress pekar på: läspositionen i ett kapitel, begreppet på begreppssidan. */
function malFor(r: Route): string | undefined {
  if (r.sida === "kapitel") return r.i;
  if (r.sida === "begrepp") return r.id;
  return undefined;
}

/**
 * Rullar vid varje navigering när innehållet är `klar`, och kör scroll-spionen
 * när `spana` är sant (kapitelsidor). Spionen pausas från navigeringen tills
 * rullningen är gjord.
 */
export function useLasposition(t: RouteTillstand, klar: boolean, spana: boolean): void {
  const lage = useRef({ sett: -1, hanterat: -1, spanar: false, forra: null as Route | null });

  useEffect(() => {
    const l = lage.current;
    if (l.sett !== t.nr) {
      l.sett = t.nr;
      if (t.rulla) l.spanar = false;
    }
    if (!klar || l.hanterat === t.nr) return;
    l.hanterat = t.nr;
    const forra = l.forra;
    l.forra = t.route;
    if (!t.rulla) {
      l.spanar = true;
      return;
    }
    const nr = t.nr;
    const id = malFor(t.route);
    // Ny sida eller ingen läsposition: börja överst
    if (!id || !forra || !sammaSida(forra, t.route)) {
      avbrytRullning();
      scrollTo(0, 0);
      mal = null;
      sattAktivtBlock("");
    }
    if (!id) {
      l.spanar = true;
      return;
    }
    void rullaTillBlock(id, { fokus: t.fokus }).finally(() => {
      if (lage.current.hanterat === nr) lage.current.spanar = true;
    });
  }, [t, klar]);

  useEffect(() => {
    if (!spana) return;
    return startaSpaning((id) => {
      if (!lage.current.spanar) return;
      sattAktivtBlock(id);
      uppdateraLasposition(id || undefined);
    });
  }, [spana]);
}
