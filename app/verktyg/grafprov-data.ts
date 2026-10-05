// grafprov-data.ts: data till grafprovet och linjediagrammets stilguidesektion.
// Hämtar en sektionsfil ur public/data och bygger en ChartSpec: först med
// WP1:s normalisera + kpiTillSpec, och när de inte finns ännu (stubbar som
// kastar) med WP2:s testhjälp provSpec. `kalla: "prov"` tvingar provSpec.
// Ägare: WP2.

import { useEffect, useState } from "react";
import { kpiTillSpec } from "../src/charts/kpiTillSpec";
import { provSpec } from "../src/charts/karna/provspec";
import type { ChartSpec } from "../src/charts/spec";
import type { VyId } from "../src/data/modell";
import { normalisera } from "../src/data/normalisera";

export type Specskalla = "auto" | "prov";

const cache = new Map<string, Promise<unknown>>();

export function hamtaSektion(vy: VyId, sektion: string): Promise<unknown> {
  const nyckel = `${vy}-${sektion}`;
  let p = cache.get(nyckel);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/${nyckel}.json`).then((r) => {
      if (!r.ok) throw new Error(`Kunde inte hämta ${nyckel}.json (HTTP ${r.status})`);
      return r.json();
    });
    cache.set(nyckel, p);
  }
  return p;
}

export function byggSpec(ra: unknown, vy: VyId, kpi: string | null, kalla: Specskalla): { spec: ChartSpec; byggd: "kpiTillSpec" | "provSpec" } {
  if (kalla === "auto") {
    try {
      const kap = normalisera(ra, vy);
      const k = kap.kpier.find((x) => x.id === kpi) ?? kap.kpier[0];
      return { spec: kpiTillSpec(k, kap, { vy, fasta: [] }, "tid"), byggd: "kpiTillSpec" };
    } catch {
      // WP1 inte sammanslagen än: använd testhjälpen
    }
  }
  return { spec: provSpec(ra, kpi, vy), byggd: "provSpec" };
}

export function useSpec(vy: VyId, sektion: string, kpi: string | null, kalla: Specskalla = "auto") {
  const [tillstand, setTillstand] = useState<{ spec: ChartSpec | null; byggd?: string; fel?: string }>({ spec: null });
  useEffect(() => {
    let levande = true;
    hamtaSektion(vy, sektion)
      .then((ra) => { if (levande) setTillstand(byggSpec(ra, vy, kpi, kalla)); })
      .catch((e: unknown) => { if (levande) setTillstand({ spec: null, fel: String(e) }); });
    return () => { levande = false; };
  }, [vy, sektion, kpi, kalla]);
  return tillstand;
}
