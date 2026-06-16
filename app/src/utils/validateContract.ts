// validateContract.ts — Lättviktig, beroendefri kontraktskontroll (endast DEV).
//
// Speglar invarianterna i R/gemensam/kontrakt.R och schema/hos-data.schema.json.
// Syftet är att tidigt upptäcka drift mellan R-exporten och frontend-typerna
// under utveckling. Loggar console.warn vid avvikelse — bearbetar ALDRIG data
// och påverkar inte produktionsbygget (no-op när import.meta.env.DEV är false).

import type { AllData } from "../types";

const VYER = ["dag", "vecka", "manad", "kvartal", "ar"] as const;
const STATUS = ["gron", "gul", "rod"];
const ENHET = ["procent", "minuter", "antal"];

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
const finns = (x: unknown) => x !== undefined && x !== null;

/** Returnerar en lista med kontraktsbrott (tom = OK). */
export function validateContract(data: unknown): string[] {
  const fel: string[] = [];
  const add = (path: string, msg: string) => fel.push(`${path} ${msg}`);

  if (!isObj(data)) return ["root: är inte ett objekt"];

  for (const vy of VYER) {
    const v = data[vy];
    if (!finns(v)) { add(vy, "saknas"); continue; }
    if (!isObj(v)) { add(vy, "är inte ett objekt"); continue; }

    for (const f of ["vy", "etikett", "period", "datum", "uppdaterad", "jmf_etikett", "analys"]) {
      if (!finns(v[f])) add(`${vy}.${f}`, "saknas");
    }
    if (!Array.isArray(v.sektioner)) { add(`${vy}.sektioner`, "är inte en array"); continue; }

    v.sektioner.forEach((s: unknown, si: number) => {
      const sp = `${vy}.sektioner[${si}]`;
      if (!isObj(s)) { add(sp, "är inte ett objekt"); return; }
      for (const f of ["id", "namn", "analys"]) if (!finns(s[f])) add(`${sp}.${f}`, "saknas");
      if (!Array.isArray(s.kpier)) { add(`${sp}.kpier`, "är inte en array"); return; }

      s.kpier.forEach((k: unknown, ki: number) => {
        const kp = `${sp}.kpier[${ki}]`;
        if (!isObj(k)) { add(kp, "är inte ett objekt"); return; }
        for (const f of ["id", "namn", "enhet", "inverterad", "senaste", "forandring", "status", "analystext"]) {
          if (!finns(k[f])) add(`${kp}.${f}`, "saknas");
        }
        if (finns(k.status) && !STATUS.includes(k.status as string)) add(`${kp}.status`, `ogiltig: ${String(k.status)}`);
        if (finns(k.enhet) && !ENHET.includes(k.enhet as string)) add(`${kp}.enhet`, `ogiltig: ${String(k.enhet)}`);
        if (!Array.isArray(k.tidsserie)) add(`${kp}.tidsserie`, "är inte en array");
        if (finns(k.undernivaer) && !Array.isArray(k.undernivaer)) add(`${kp}.undernivaer`, "är inte en array");
      });
    });
  }
  return fel;
}

/** Kör kontraktskontrollen i DEV och logga resultatet. No-op i produktion. */
export function assertContractDev(data: AllData): void {
  if (!import.meta.env.DEV) return;
  const fel = validateContract(data);
  if (fel.length) {
    console.warn(`[hos-data] ${fel.length} kontraktsbrott (frontend dev-kontroll):\n${fel.join("\n")}`);
  } else {
    console.info("[hos-data] kontraktsvalidering OK");
  }
}
