// analys.ts — Rubrik för AI-analysen.
//
// AI-analysens korta rubrik genereras primärt i R (fält `analys_rubrik`).
// Dessa helpers ger en deterministisk, IDENTISK fallback i frontend så att
// rubriken visas korrekt även innan R-pipelinen körts om. R-sidan
// (R/gemensam/analystext.R) speglar samma status → rubrik-mappning.

type Status = "gron" | "gul" | "rod";

const RUBRIK_PER_STATUS: Record<Status, string> = {
  gron: "Inom förväntat",
  gul: "Att bevaka",
  rod: "Avvikelse att åtgärda",
};

/** Den globala sammanfattningens rubrik (status varierar → fast etikett). */
export const ANALYS_RUBRIK_GLOBAL = "Sammanfattning";

/** Kort rubrik härledd ur en signalstatus. */
export function analysRubrikForStatus(status?: string): string {
  return RUBRIK_PER_STATUS[status as Status] ?? "Analys";
}
