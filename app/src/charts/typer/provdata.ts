// charts/typer/provdata.ts: TESTHJÄLP för WP3:s tester. Specar för en
// visning ur alla datafiler (public/data) via WP1:s normalisera och
// kpiTillSpec, som karna/testdata.ts gör för linjen. Ägare: WP3.

import type { KpiModell, VyId } from "../../data/modell";
import { sistaMedVarde } from "../../data/normalisera";
import { kpiTillSpec, visningar } from "../kpiTillSpec";
import { kapitel } from "../karna/testdata";
import type { ChartSpec, DiagramTyp, VisningId } from "../spec";

const filer = Object.keys(import.meta.glob("../../../public/data/*.json"));

export interface Prov {
  fil: string;
  vy: VyId;
  sektion: string;
  kpi: KpiModell;
  spec: ChartSpec;
}

/** Alla datafiler som (vy, sektion). */
export function datafiler(): { fil: string; vy: VyId; sektion: string }[] {
  return filer.sort().flatMap((sokvag) => {
    const fil = sokvag.split("/").pop() ?? "";
    const m = /^(dag|vecka|manad|kvartal|ar)-(.+)\.json$/.exec(fil);
    return m ? [{ fil, vy: m[1] as VyId, sektion: m[2] }] : [];
  });
}

/**
 * Indikatorn med bara fokusseriens senaste värde kvar. Fokus har då plats för
 * en period, och visningen rang blir regionernas rangordning (punktdiagrammet)
 * i stället för bumpdiagrammet, som kräver plats för minst två perioder
 * (kpiTillSpec, 2026-10-08). Rangordningen gäller senaste perioden och rank ur
 * datan, så specen blir densamma som för hela serien.
 */
export function utanPlatshistorik(kpi: KpiModell): KpiModell {
  const f = kpi.serier[kpi.fokus];
  const i = sistaMedVarde(f.tidsserie);
  const tidsserie = f.tidsserie.map((p, j) => (j === i ? p : { ...p, varde: null }));
  return { ...kpi, serier: { ...kpi.serier, [kpi.fokus]: { ...f, tidsserie } } };
}

/** Specen för en visning i alla indikatorer som har den och ritas som `typ`; `forbered` ändrar indikatorn först. */
export function allaSpecar(visning: VisningId, typ: DiagramTyp, fasta: string[] = [], forbered: (k: KpiModell) => KpiModell = (k) => k): Prov[] {
  const ut: Prov[] = [];
  for (const { fil, vy, sektion } of datafiler()) {
    const kap = kapitel(vy, sektion);
    for (const kpi of kap.kpier) {
      if (!visningar(kpi, kap, { vy }).some((v) => v.id === visning)) continue;
      const k = forbered(kpi);
      const spec = kpiTillSpec(k, kap, { vy, fasta }, visning);
      if (spec.typ === typ) ut.push({ fil, vy, sektion, kpi: k, spec });
    }
  }
  return ut;
}

/** En indikators spec för en visning; `forbered` ändrar indikatorn först. */
export function provSpec(
  vy: VyId, sektion: string, kpiId: string, visning: VisningId, fasta: string[] = [], forbered: (k: KpiModell) => KpiModell = (k) => k,
): ChartSpec {
  const kap = kapitel(vy, sektion);
  const kpi = kap.kpier.find((k) => k.id === kpiId);
  if (!kpi) throw new Error(`Saknar ${kpiId} i ${vy}-${sektion}`);
  return kpiTillSpec(forbered(kpi), kap, { vy, fasta }, visning);
}
