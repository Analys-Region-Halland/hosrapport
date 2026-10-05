// charts/karna/testdata.ts: TESTHJÄLP. Linjespecar ur dagens JSON-filer
// (app/public/data) via WP1:s normalisera och kpiTillSpec, för WP2:s tester.
// Filerna laddas med import.meta.glob så att inga node-moduler behövs.
// Ägare: WP2.

import type { KapitelModell, VyId } from "../../data/modell";
import { normalisera } from "../../data/normalisera";
import { kpiTillSpec } from "../kpiTillSpec";
import type { ChartSpec } from "../spec";

const filer = import.meta.glob<unknown>("../../../public/data/*.json", { eager: true, import: "default" });

export interface Fixtur {
  fil: string;
  vy: VyId;
  sektion: string;
  kpiId: string;
  spec: ChartSpec;
}

const kapitelCache = new Map<string, KapitelModell>();

/** Normaliserat kapitel för en vy och ett kapitel, t.ex. ("ar", "skr-tillganglighet"). */
export function kapitel(vy: VyId, sektion: string): KapitelModell {
  const nyckel = `${vy}-${sektion}`;
  let kap = kapitelCache.get(nyckel);
  if (!kap) {
    const sokvag = Object.keys(filer).find((f) => f.endsWith(`/${nyckel}.json`));
    if (!sokvag) throw new Error(`Saknar data för ${nyckel}`);
    kap = normalisera(filer[sokvag], vy);
    kapitelCache.set(nyckel, kap);
  }
  return kap;
}

/** Tidsvisningens spec för en indikator, med fästa enheter som figuren skulle skicka. */
export function fixtur(vy: VyId, sektion: string, kpiId: string, fasta: string[] = []): ChartSpec {
  const kap = kapitel(vy, sektion);
  const kpi = kap.kpier.find((k) => k.id === kpiId);
  if (!kpi) throw new Error(`Saknar ${kpiId} i ${vy}-${sektion}`);
  return kpiTillSpec(kpi, kap, { vy, fasta }, "tid");
}

/** Alla indikatorer vars tidsvisning är ett linjediagram, i alla datafiler. */
export function allaLinjer(): Fixtur[] {
  const ut: Fixtur[] = [];
  for (const sokvag of Object.keys(filer).sort()) {
    const fil = sokvag.split("/").pop()!;
    const m = /^(dag|vecka|manad|kvartal|ar)-(.+)\.json$/.exec(fil);
    if (!m) continue;
    const vy = m[1] as VyId;
    const kap = kapitel(vy, m[2]);
    for (const kpi of kap.kpier) {
      const spec = kpiTillSpec(kpi, kap, { vy }, "tid");
      if (spec.typ === "linje") ut.push({ fil, vy, sektion: m[2], kpiId: kpi.id, spec });
    }
  }
  return ut;
}
