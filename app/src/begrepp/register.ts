// begrepp/register.ts: begreppsregistret (docs/arkitektur.md 4.5, stilguiden 5.7).
// Innehållet ligger i innehall/begrepp.json i repo-roten. Ägare: WP5.
// Stubb från WP0: Begrepp är slutlig; funktionen är preliminär.

export interface Begrepp {
  id: string; term: string;
  former: string[];          // böjningsformer och synonymer som ska länkas
  kort: string;              // ≤ 25 ord
  lang?: string;             // ≤ 80 ord
  kalla?: { namn: string; url?: string };
  se_aven?: string[];
  kategori: "metod" | "statistik" | "vard" | "ekonomi" | "rapport";
  undantag?: string[];       // fraser där termen inte ska länkas
}

/** Slår upp ett begrepp på id. */
export function hittaBegrepp(_reg: Begrepp[], _id: string): Begrepp | undefined {
  throw new Error("Ej byggd: WP5");
}
