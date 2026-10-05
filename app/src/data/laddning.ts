// data/laddning.ts: hämtar manifest och kapitel och normaliserar dem.
// Ägare: WP1. Stubb från WP0; signaturerna är preliminära.

import type { RaManifest } from "./kontrakt";
import type { KapitelModell, VyId } from "./modell";

export function laddaManifest(): Promise<RaManifest> {
  throw new Error("Ej byggd: WP1");
}

export function laddaKapitel(_vy: VyId, _kapitelId: string): Promise<KapitelModell> {
  throw new Error("Ej byggd: WP1");
}
