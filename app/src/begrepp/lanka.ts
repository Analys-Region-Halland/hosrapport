// begrepp/lanka.ts: länkar begrepp i löptext (docs/arkitektur.md 4.5, stilguiden 5.7).
// Ägare: WP5.
//
// Ordning:
//   1. Explicit markering `[[id|text]]` (eller `[[id]]`, som visar termen) tas först,
//      i textens ordning. Den gör anspråk på sitt id före de automatiska träffarna,
//      även om en automatisk träff står tidigare i texten. Okänt id blir ren text.
//   2. Automatiska träffar på term och former. Längsta matchning först: bland
//      överlappande träffar vinner den längsta, vid lika längd den tidigaste.
//   3. Bara första förekomsten per omfång länkas. Omfånget är `redan`, som
//      anroparen delar inom en indikator (och per kapitelblock). Funktionen lägger
//      till de id den länkar.
//
// Ordgränser: en träff får inte ha en bokstav (\p{L}), en siffra (\p{N}) eller ett
// bindestreck direkt före eller efter sig, så termer länkas aldrig inne i ord
// ("överbeläggning", "vårdgarantimåtten", "KPP-beräknad") och "topp 3" träffar inte
// "topp 30". Mellanrum i en form matchar alla blanktecken, även hårt mellanslag.
// Matchningen är skiftlägesokänslig och klarar å, ä och ö.
//
// Undantag: en träff som ligger helt inne i en av begreppets `undantag`-fraser
// länkas inte, men andra begrepp får fortfarande träffa där.

import type { Begrepp } from "./register";

export type Del = string | { id: string; text: string };

interface Form { id: string; re: RegExp; langd: number }
interface Kompilerat {
  former: Form[];
  undantag: Map<string, RegExp[]>;
  perId: Map<string, Begrepp>;
}

const FORE = "(?<![\\p{L}\\p{N}\\-])";
const EFTER = "(?![\\p{L}\\p{N}\\-])";
const EXPLICIT = /\[\[([^[\]|]+)(?:\|([^[\]]*))?\]\]/g;

function uttryck(fras: string): RegExp {
  const kropp = fras
    .trim()
    .split(/\s+/)
    .map((ord) => ord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  return new RegExp(`${FORE}${kropp}${EFTER}`, "giu");
}

const cache = new WeakMap<Begrepp[], Kompilerat>();

function kompilera(reg: Begrepp[]): Kompilerat {
  const finns = cache.get(reg);
  if (finns) return finns;
  const former: Form[] = [];
  const undantag = new Map<string, RegExp[]>();
  const perId = new Map<string, Begrepp>();
  for (const b of reg) {
    perId.set(b.id, b);
    const sedda = new Set<string>();
    for (const f of [b.term, ...b.former]) {
      const nyckel = f.trim().toLocaleLowerCase("sv");
      if (!nyckel || sedda.has(nyckel)) continue;
      sedda.add(nyckel);
      former.push({ id: b.id, re: uttryck(f), langd: f.trim().length });
    }
    if (b.undantag?.length) undantag.set(b.id, b.undantag.map(uttryck));
  }
  former.sort((a, b) => b.langd - a.langd);
  const k = { former, undantag, perId };
  cache.set(reg, k);
  return k;
}

interface Traff { start: number; slut: number; id: string }

/** Automatisk länkning i en bit text utan explicit markering. */
function lankaAutomatiskt(text: string, k: Kompilerat, redan: Set<string>): Del[] {
  const sparr = new Map<string, [number, number][]>();
  for (const [id, lista] of k.undantag) {
    const spann: [number, number][] = [];
    for (const re of lista) for (const m of text.matchAll(re)) spann.push([m.index, m.index + m[0].length]);
    if (spann.length) sparr.set(id, spann);
  }

  const kandidater: Traff[] = [];
  for (const f of k.former) {
    for (const m of text.matchAll(f.re)) {
      const t = { start: m.index, slut: m.index + m[0].length, id: f.id };
      if (sparr.get(f.id)?.some(([s, e]) => t.start >= s && t.slut <= e)) continue;
      kandidater.push(t);
    }
  }
  // Längsta matchning först, vid lika längd den tidigaste.
  kandidater.sort((a, b) => (b.slut - b.start) - (a.slut - a.start) || a.start - b.start);
  const valda: Traff[] = [];
  for (const t of kandidater) {
    if (!valda.some((v) => t.start < v.slut && v.start < t.slut)) valda.push(t);
  }
  valda.sort((a, b) => a.start - b.start);

  const ut: Del[] = [];
  let pos = 0;
  for (const v of valda) {
    if (v.start > pos) ut.push(text.slice(pos, v.start));
    const bit = text.slice(v.start, v.slut);
    if (redan.has(v.id)) ut.push(bit);
    else {
      ut.push({ id: v.id, text: bit });
      redan.add(v.id);
    }
    pos = v.slut;
  }
  if (pos < text.length) ut.push(text.slice(pos));
  return ut;
}

/** Slår ihop intilliggande textbitar och tar bort tomma. */
function slaIhop(delar: Del[]): Del[] {
  const ut: Del[] = [];
  for (const d of delar) {
    const sista = ut[ut.length - 1];
    if (typeof d === "string") {
      if (!d) continue;
      if (typeof sista === "string") ut[ut.length - 1] = sista + d;
      else ut.push(d);
    } else ut.push(d);
  }
  return ut;
}

/** Delar upp `text` i ren text och länkade begrepp. `redan` är omfångets
 *  redan länkade id; funktionen lägger till de id den länkar. */
export function lankaBegrepp(text: string, reg: Begrepp[], redan: Set<string>):
  (string | { id: string; text: string })[] {
  const k = kompilera(reg);

  // 1. Dela upp i textbitar och explicita markeringar.
  type Bit = { typ: "text"; text: string } | { typ: "explicit"; id: string; text: string; lank: boolean };
  const bitar: Bit[] = [];
  let pos = 0;
  for (const m of text.matchAll(EXPLICIT)) {
    if (m.index > pos) bitar.push({ typ: "text", text: text.slice(pos, m.index) });
    const id = m[1].trim();
    const visad = m[2]?.trim() || k.perId.get(id)?.term || id;
    bitar.push({ typ: "explicit", id, text: visad, lank: false });
    pos = m.index + m[0].length;
  }
  if (pos < text.length) bitar.push({ typ: "text", text: text.slice(pos) });

  // 2. Explicita markeringar gör anspråk först, i textens ordning.
  for (const b of bitar) {
    if (b.typ === "explicit" && k.perId.has(b.id) && !redan.has(b.id)) {
      b.lank = true;
      redan.add(b.id);
    }
  }

  // 3. Automatiska träffar i textbitarna.
  const ut: Del[] = [];
  for (const b of bitar) {
    if (b.typ === "text") ut.push(...lankaAutomatiskt(b.text, k, redan));
    else ut.push(b.lank ? { id: b.id, text: b.text } : b.text);
  }
  return slaIhop(ut);
}

// ── Omfång som delas mellan flera textblock ──
// Prosa (React) länkar under renderingen, och en komponent kan renderas flera
// gånger (StrictMode, ny text). Varje id i ett delat `redan` får därför en ägare:
// det textblock som länkade det. Ett block som renderas om släpper först sina
// egna anspråk och länkar sedan på nytt, så resultatet blir detsamma varje gång,
// medan id som andra block redan äger fortsätter att vara spärrade.

const agare = new WeakMap<Set<string>, Map<string, string>>();

function agarkarta(redan: Set<string>): Map<string, string> {
  let karta = agare.get(redan);
  if (!karta) {
    karta = new Map();
    agare.set(redan, karta);
  }
  return karta;
}

/** Länkar stycken i ordning inom omfånget `redan`, för textblocket `agarId`.
 *  Samma anrop två gånger ger samma resultat. */
export function lankaStycken(stycken: string[], reg: Begrepp[], redan: Set<string>, agarId: string): Del[][] {
  slappAnsprak(redan, agarId);
  const ut = stycken.map((t) => lankaBegrepp(t, reg, redan));
  gorAnsprak(redan, agarId, lankadeId(ut));
  return ut;
}

/** Id som är länkade i resultatet från lankaStycken. */
export function lankadeId(delar: Del[][]): string[] {
  return delar.flat().flatMap((d) => (typeof d === "string" ? [] : [d.id]));
}

/** Lägger tillbaka textblockets anspråk (efter att de släppts). */
export function gorAnsprak(redan: Set<string>, agarId: string, ids: string[]): void {
  const karta = agarkarta(redan);
  for (const id of ids) {
    if (karta.has(id) && karta.get(id) !== agarId) continue;
    redan.add(id);
    karta.set(id, agarId);
  }
}

/** Släpper textblockets anspråk, t.ex. när det tas bort. */
export function slappAnsprak(redan: Set<string>, agarId: string): void {
  const karta = agarkarta(redan);
  for (const [id, a] of karta) {
    if (a === agarId) {
      karta.delete(id);
      redan.delete(id);
    }
  }
}

/** Tar bort explicit markering och lämnar den visade texten. För rubriker,
 *  knappar, tabeller och aria-etiketter, där begrepp aldrig länkas. */
export function utanMarkering(text: string, reg?: Begrepp[]): string {
  return text.replace(EXPLICIT, (_hel, id: string, visad?: string) =>
    visad?.trim() || (reg ? kompilera(reg).perId.get(id.trim())?.term : undefined) || id.trim());
}
