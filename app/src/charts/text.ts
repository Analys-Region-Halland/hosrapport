// charts/text.ts: figurens titel, undertitel och textsammanfattning enligt
// stilguiden 6.2, 6.8 och 3.2. Ägare: WP1. Stubb från WP0; signaturerna är
// preliminära.

import type { KapitelModell, KpiModell } from "../data/modell";
import type { SpecKontext, VisningId } from "./spec";

export function figurTitel(_kpi: KpiModell, _kap: KapitelModell, _ctx: SpecKontext, _visning: VisningId): string {
  throw new Error("Ej byggd: WP1");
}

export function figurUndertitel(_kpi: KpiModell, _kap: KapitelModell, _ctx: SpecKontext, _visning: VisningId): string {
  throw new Error("Ej byggd: WP1");
}

export function textsammanfattning(_kpi: KpiModell, _kap: KapitelModell, _ctx: SpecKontext, _visning: VisningId): string {
  throw new Error("Ej byggd: WP1");
}
