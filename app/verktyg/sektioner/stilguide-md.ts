// stilguide-md.ts: läser tabeller ur docs/stilguide.md, så att den levande
// stilguiden kan visa den normerande texten bredvid värdena ur tema.ts och
// varna när de skiljer sig. Ägare: WP7.
//
// Bara enkla pipetabeller (rubrikrad, avskiljare, datarader) under en numrerad
// rubrik ("### 2.1 Färg"). Tabellerna är dokumentation; listorna av tokens
// läses alltid ur tema.ts.

import md from "../../../docs/stilguide.md?raw";

export interface MdTabell {
  kolumner: string[];
  rader: Record<string, string>[];
}

const RADER = md.split(/\r?\n/);

/** Rader under rubriken som börjar med `nr` ("2.1", "6.4"), fram till nästa rubrik på samma eller högre nivå. */
function avsnitt(nr: string): string[] {
  const start = RADER.findIndex((r) => new RegExp(`^#{2,4}\\s+${nr.replace(/\./g, "\\.")}\\.?\\s`).test(r));
  if (start < 0) return [];
  const niva = RADER[start].match(/^#+/)![0].length;
  const slut = RADER.findIndex((r, i) => i > start && /^#+\s/.test(r) && r.match(/^#+/)![0].length <= niva);
  return RADER.slice(start + 1, slut < 0 ? undefined : slut);
}

const celler = (rad: string) => rad.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

/** Tar bort markdown-markering ur en cell: `kod`, **fet**. */
export const rensa = (cell: string) => cell.replace(/`/g, "").replace(/\*\*/g, "").trim();

/** Den `index`:e tabellen (från 0) under rubriken `nr`, eller null. Cellerna är orensade. */
export function stilguideTabell(nr: string, index = 0): MdTabell | null {
  const rader = avsnitt(nr);
  let hittade = -1;
  for (let i = 0; i < rader.length; i++) {
    if (!rader[i].startsWith("|") || !/^\|[\s:|-]+\|$/.test(rader[i + 1]?.trim() ?? "")) continue;
    hittade++;
    const kolumner = celler(rader[i]).map(rensa);
    let j = i + 2;
    const data: Record<string, string>[] = [];
    while (j < rader.length && rader[j].startsWith("|")) {
      const c = celler(rader[j]);
      data.push(Object.fromEntries(kolumner.map((k, n) => [k, c[n] ?? ""])));
      j++;
    }
    if (hittade === index) return { kolumner, rader: data };
    i = j;
  }
  return null;
}

/** Slår upp en rad i en tabell på en kolumns rensade värde. */
export function radFor(tabell: MdTabell | null, kolumn: string, varde: string): Record<string, string> | undefined {
  return tabell?.rader.find((r) => rensa(r[kolumn] ?? "") === varde);
}

/** Statusens etikett ur stilguiden 2.3: "I fas", "Bevaka", "Avvikelse". */
export function statusEtikett(status: string): string {
  const rad = radFor(stilguideTabell("2.3"), "Status", status);
  return (rad && rensa(rad["Etikett"] ?? "")) || status;
}

/** Löptexten (utan tabeller) under en rubrik, som stycken. */
export function stilguideStycken(nr: string): string[] {
  return avsnitt(nr).filter((r) => r.trim() && !r.startsWith("|") && !r.startsWith("```") && !r.startsWith("#"))
    .map((r) => r.replace(/^- /, "").trim());
}

/** Versionsraden överst i stilguiden, t.ex. "Version 1.0 · 2026-10-05". */
export const stilguideVersion: string | null = RADER.find((r) => /^Version\s/.test(r))?.split(" · ").slice(0, 2).join(" · ") ?? null;

/** Alla hexfärger i en text, i versaler. */
export const hexIText = (text: string) => (text.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((h) => h.toUpperCase());

/** Alla tokenreferenser (`rum.9`, `farg.fokus` …) i en cell. */
export const tokensIText = (text: string) => (text.match(/`([a-zA-Z]+(?:\.[a-zA-Z0-9]+)+)`/g) ?? []).map((t) => t.slice(1, -1));
