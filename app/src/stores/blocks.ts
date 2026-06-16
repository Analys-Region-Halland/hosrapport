import type { ContentBlock } from "../types";

// ════════════════════════════════════════════════════════════
//  Persistenslager för användarens rapporttext (ContentBlock).
//
//  DETTA ÄR BACKEND-SÖMMEN. Idag lagras allt i localStorage (per webbläsare).
//  För att koppla in en server senare: byt implementationen i loadStore/
//  persist mot fetch mot ett API — den publika ytan (getBlocks/setBlocks/
//  setAllBlocks/exportAllBlocks/importAllBlocks) hålls oförändrad så att
//  komponenterna inte behöver röras. (OBS: detta är ENBART användarens egna
//  kommentarer — aldrig R-genererad KPI-data.)
// ════════════════════════════════════════════════════════════

export const BLOCKS_KEY = "hos-rapport-content-blocks";

type BlockStore = Record<string, ContentBlock[]>;

function loadStore(): BlockStore {
  try {
    return JSON.parse(localStorage.getItem(BLOCKS_KEY) || "{}");
  } catch {
    return {};
  }
}

function persist(store: BlockStore): void {
  localStorage.setItem(BLOCKS_KEY, JSON.stringify(store));
}

// Lazy migration vid läsning → enhetlig komposit-typ "anteckning" (rubrik +
// text + skribent). "ai"-block droppas (renderas alltid från aktuell R-text,
// lagras aldrig). Äldre format mappas losslesst:
//   "kommentar" (title+text+author)  → "anteckning" rakt av
//   fristående "rubrik"              → "anteckning" med bara title
//   fristående "stycke"              → "anteckning" med bara text
// Idempotent: redan migrerade "anteckning"-block passerar oförändrade.
function migrera(blocks: ContentBlock[]): ContentBlock[] {
  const out: ContentBlock[] = [];
  for (const b of blocks) {
    if (b.type === "ai") continue;
    if (b.type === "anteckning") {
      out.push(b);
    } else if (b.type === "kommentar") {
      out.push({
        id: b.id, type: "anteckning",
        title: b.title?.trim() || undefined, text: b.text || "",
        author: b.author, timestamp: b.timestamp,
      });
    } else if (b.type === "rubrik") {
      out.push({ id: b.id, type: "anteckning", title: b.text?.trim() || undefined, text: "", author: b.author, timestamp: b.timestamp });
    } else if (b.type === "stycke") {
      out.push({ id: b.id, type: "anteckning", text: b.text || "", author: b.author, timestamp: b.timestamp });
    }
  }
  return out;
}

/** Returnerar användarens egna block (rubrik/stycke), migrerade från äldre format. */
export function getBlocks(targetId: string): ContentBlock[] {
  return migrera(loadStore()[targetId] || []);
}

export function setBlocks(targetId: string, blocks: ContentBlock[]): void {
  const store = loadStore();
  if (blocks.length === 0) {
    delete store[targetId];
  } else {
    store[targetId] = blocks;
  }
  persist(store);
}

/** Hela lagret som JSON-sträng (för export/backup). */
export function exportAllBlocks(): string {
  return JSON.stringify(loadStore(), null, 2);
}

// ── Skribentnamn ──────────────────────────────────────────────
// Senast använda skribent sparas separat och förifylls i editorn så att
// bylinen ("✎ {namn} · {datum}") inte behöver skrivas om för varje block.
const FORFATTARE_KEY = "hos-rapport-forfattare";

export function getForfattare(): string {
  try { return localStorage.getItem(FORFATTARE_KEY) || ""; }
  catch { return ""; }
}

export function setForfattare(namn: string): void {
  try {
    const n = namn.trim();
    if (n) localStorage.setItem(FORFATTARE_KEY, n);
  } catch { /* localStorage kan vara otillgängligt */ }
}

/** Skriv över hela lagret (för import). Kastar vid ogiltig JSON. */
export function importAllBlocks(json: string): void {
  const parsed = JSON.parse(json) as BlockStore;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Ogiltigt format: förväntade ett objekt { nyckel: block[] }");
  }
  persist(parsed);
}
