// nav/lager.ts: stapeln av öppna lager (popover, ark, förstoring). Escape stänger
// bara det översta (docs/arkitektur.md 4.6). Ägare: WP6. Stubb från WP0;
// signaturen är preliminär.

/** Lägger ett lager överst. Returnerar en funktion som tar bort det. */
export function oppnaLager(_stang: () => void): () => void {
  throw new Error("Ej byggd: WP6");
}
