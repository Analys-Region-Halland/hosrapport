// nav/route.ts: rapportens adresser (docs/arkitektur.md 4.6). parse och format
// är rena funktioner. Ägare: WP6. Stubb från WP0; Route är preliminär tills
// WP6 bestämt den, men följer adresstabellen i 4.6.

import type { VisningId } from "../charts/spec";
import type { VyId } from "../data/modell";

export type Route =
  | { sida: "start" }
  | { sida: "sammanfattning"; vy: VyId }
  | { sida: "kapitel"; id: string; vy: VyId; i?: string; v?: VisningId; e?: string; red?: boolean }
  | { sida: "begrepp"; id?: string }
  | { sida: "las" };

/** Tolkar location.hash. Gamla ankare (#rapport-{x}) skrivs om till kapiteladresser. */
export function parse(_hash: string): Route {
  throw new Error("Ej byggd: WP6");
}

/** Bygger hash för en adress, t.ex. "#/kapitel/skr-tillganglighet?vy=ar&i=x". */
export function format(_route: Route): string {
  throw new Error("Ej byggd: WP6");
}
