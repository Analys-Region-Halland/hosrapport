// charts/typer/provdata.ts: TESTHJÄLP för WP3:s tester. Specar för en
// visning ur alla datafiler (public/data) via WP1:s normalisera och
// kpiTillSpec, som karna/testdata.ts gör för linjen. Ägare: WP3.

import type { KpiModell, VyId } from "../../data/modell";
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

/** Specen för en visning i alla indikatorer som har den och ritas som `typ`. */
export function allaSpecar(visning: VisningId, typ: DiagramTyp, fasta: string[] = []): Prov[] {
  const ut: Prov[] = [];
  for (const { fil, vy, sektion } of datafiler()) {
    const kap = kapitel(vy, sektion);
    for (const kpi of kap.kpier) {
      if (!visningar(kpi, kap, { vy }).some((v) => v.id === visning)) continue;
      const spec = kpiTillSpec(kpi, kap, { vy, fasta }, visning);
      if (spec.typ === typ) ut.push({ fil, vy, sektion, kpi, spec });
    }
  }
  return ut;
}

/** En indikators spec för en visning. */
export function provSpec(vy: VyId, sektion: string, kpiId: string, visning: VisningId, fasta: string[] = []): ChartSpec {
  const kap = kapitel(vy, sektion);
  const kpi = kap.kpier.find((k) => k.id === kpiId);
  if (!kpi) throw new Error(`Saknar ${kpiId} i ${vy}-${sektion}`);
  return kpiTillSpec(kpi, kap, { vy, fasta }, visning);
}
