// ui/fokus.ts: hjälp för tangentbordsfokus i popover och ark. Ägare: WP5.

const TABBAR = [
  "a[href]", "area[href]", "button:not([disabled])", "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])", "textarea:not([disabled])", "summary", "iframe",
  "[tabindex]:not([tabindex='-1'])", "[contenteditable='true']",
].join(",");

/** Element som går att klicka till fokus på, även med tabindex -1. */
export const FOKUSERBAR = `${TABBAR},[tabindex]`;

const synlig = (el: HTMLElement) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";

/** Element som nås med Tab inuti `rot`, i dokumentordning. */
export function tabbara(rot: ParentNode): HTMLElement[] {
  return [...rot.querySelectorAll<HTMLElement>(TABBAR)].filter((el) => el.tabIndex >= 0 && synlig(el));
}

/** Flyttar fokus till det första tabbara elementet efter `el`, utanför `utom`.
 *  Ligger `el` i en modal dialog (till exempel ett ark) söks bara inuti den.
 *  Finns inget sådant får `el` själv fokus. */
export function fokuseraEfter(el: HTMLElement, utom?: HTMLElement | null): void {
  const rot: ParentNode = el.closest("[aria-modal='true']") ?? document;
  const nasta = tabbara(rot).find((k) =>
    k !== el && !el.contains(k) && !(utom && utom.contains(k))
    && (el.compareDocumentPosition(k) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
  (nasta ?? el).focus({ preventScroll: false });
}
