// charts/kpiTillSpec.ts: ren funktion från KpiModell till ChartSpec
// (docs/arkitektur.md 4.2). Ägare: WP1. Stubb från WP0.

import type { KapitelModell, KpiModell } from "../data/modell";
import type { ChartSpec, SpecKontext, VisningId } from "./spec";

export function visningar(_kpi: KpiModell, _kap: KapitelModell, _ctx: SpecKontext): { id: VisningId; etikett: string }[] {
  throw new Error("Ej byggd: WP1");
}

export function kpiTillSpec(_kpi: KpiModell, _kap: KapitelModell, _ctx: SpecKontext, _visning: VisningId): ChartSpec {
  throw new Error("Ej byggd: WP1");
}
