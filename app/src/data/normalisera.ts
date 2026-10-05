// data/normalisera.ts: läser kontrakt v1 och v2 och ger KapitelModell
// (docs/arkitektur.md 4.1). Ägare: WP1. Stubb från WP0.

import type { KapitelModell, VyId } from "./modell";

export function normalisera(_raw: unknown, _vy: VyId): KapitelModell {
  throw new Error("Ej byggd: WP1");
}
