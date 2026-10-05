// grafprov-data.ts: data till grafprovet och linjediagrammets stilguidesektion.
// Hämtar en sektionsfil ur public/data, normaliserar den (WP1) och bygger
// tidsvisningens spec med kpiTillSpec, med de fästa enheterna i kontexten,
// precis som figuren gör i rapporten. Ägare: WP2.

import { useEffect, useMemo, useState } from "react";
import { kpiTillSpec } from "../src/charts/kpiTillSpec";
import type { ChartSpec, VisningId } from "../src/charts/spec";
import type { KapitelModell, VyId } from "../src/data/modell";
import { normalisera } from "../src/data/normalisera";

const cache = new Map<string, Promise<KapitelModell>>();

export function hamtaKapitel(vy: VyId, sektion: string): Promise<KapitelModell> {
  const nyckel = `${vy}-${sektion}`;
  let p = cache.get(nyckel);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/${nyckel}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Kunde inte hämta ${nyckel}.json (HTTP ${r.status})`);
        return r.json();
      })
      .then((ra: unknown) => normalisera(ra, vy));
    cache.set(nyckel, p);
  }
  return p;
}

/**
 * Specen för en indikator. Byggs om när de fästa enheterna ändras (en ny
 * spec ritar om de statiska lagren, som stilguiden 6.8 föreskriver), men
 * inte vid hovring.
 */
export function useSpec(vy: VyId, sektion: string, kpiId: string | null, fasta: string[], visning: VisningId = "tid") {
  const [kap, setKap] = useState<KapitelModell | null>(null);
  const [fel, setFel] = useState<string | null>(null);
  useEffect(() => {
    let levande = true;
    hamtaKapitel(vy, sektion)
      .then((k) => { if (levande) setKap(k); })
      .catch((e: unknown) => { if (levande) setFel(String(e)); });
    return () => { levande = false; };
  }, [vy, sektion]);
  const nyckel = fasta.join(",");
  const spec = useMemo<ChartSpec | null>(() => {
    if (!kap) return null;
    const kpi = kap.kpier.find((k) => k.id === kpiId) ?? kap.kpier[0];
    return kpiTillSpec(kpi, kap, { vy, fasta: nyckel ? nyckel.split(",") : [] }, visning);
  }, [kap, kpiId, vy, nyckel, visning]);
  return { spec, fel };
}
