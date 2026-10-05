// charts/karna/testdata.ts: TESTHJÄLP. Dagens JSON-filer (app/public/data) som
// rå sektioner, för WP2:s tester. Laddas med import.meta.glob så att inga
// node-moduler behövs. Ägare: WP2.

import type { VyId } from "../../data/modell";
import { kpiIdn, provSpec, type ProvSpec } from "./provspec";

const filer = import.meta.glob<unknown>("../../../public/data/*.json", { eager: true, import: "default" });

export interface Fixtur {
  fil: string;
  vy: VyId;
  sektion: string;
  kpiId: string;
  spec: ProvSpec;
}

/** Rå sektion för en vy och ett kapitel, t.ex. ("ar", "skr-tillganglighet"). */
export function raSektion(vy: VyId, sektion: string): unknown {
  const nyckel = Object.keys(filer).find((f) => f.endsWith(`/${vy}-${sektion}.json`));
  if (!nyckel) throw new Error(`Saknar data för ${vy}-${sektion}`);
  return filer[nyckel];
}

/** Spec för en indikator. */
export function fixtur(vy: VyId, sektion: string, kpiId: string): ProvSpec {
  return provSpec(raSektion(vy, sektion), kpiId, vy);
}

/** Alla indikatorer i alla sektionsfiler som linjespecar. */
export function allaFixturer(): Fixtur[] {
  const ut: Fixtur[] = [];
  for (const [sokvag, data] of Object.entries(filer)) {
    const fil = sokvag.split("/").pop()!;
    if (fil === "index.json") continue;
    const m = /^(dag|vecka|manad|kvartal|ar)-(.+)\.json$/.exec(fil);
    if (!m) continue;
    const vy = m[1] as VyId;
    for (const kpiId of kpiIdn(data)) ut.push({ fil, vy, sektion: m[2], kpiId, spec: provSpec(data, kpiId, vy) });
  }
  return ut;
}
