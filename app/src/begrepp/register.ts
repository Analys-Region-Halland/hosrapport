// begrepp/register.ts: begreppsregistret (docs/arkitektur.md 4.5, stilguiden 5.7).
// Innehållet ligger i innehall/begrepp.json i repo-roten och läses in vid bygget
// (JSON-import), så att registret finns utan nätverksanrop. Ägare: WP5.

import data from "../../../innehall/begrepp.json";

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

/** En post i innehall/begrepp.json: ett begrepp plus redaktionell status.
 *  `granskad` är false tills en sakkunnig har läst definitionen. */
export interface BegreppPost extends Begrepp {
  granskad: boolean;
}

export const KATEGORIER: readonly Begrepp["kategori"][] = ["metod", "statistik", "vard", "ekonomi", "rapport"];

const arStrang = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const arStranglista = (v: unknown): v is string[] => Array.isArray(v) && v.every(arStrang);

/** Kontrollerar formen på registret och returnerar det typat. Kastar med ett
 *  meddelande som pekar ut posten när ett fält saknas eller har fel typ. */
export function tolkaRegister(raw: unknown): BegreppPost[] {
  if (!Array.isArray(raw)) throw new Error("begrepp.json: väntade en lista");
  return raw.map((p: unknown, i): BegreppPost => {
    const fel = (falt: string) => new Error(`begrepp.json, post ${i + 1}: fältet ${falt} saknas eller har fel typ`);
    if (typeof p !== "object" || p === null) throw fel("(posten)");
    const o = p as Record<string, unknown>;
    if (!arStrang(o.id)) throw fel("id");
    if (!arStrang(o.term)) throw fel("term");
    if (!Array.isArray(o.former) || !(o.former.length === 0 || arStranglista(o.former))) throw fel("former");
    if (!arStrang(o.kort)) throw fel("kort");
    if (o.lang !== undefined && !arStrang(o.lang)) throw fel("lang");
    if (o.se_aven !== undefined && !arStranglista(o.se_aven)) throw fel("se_aven");
    if (o.undantag !== undefined && !arStranglista(o.undantag)) throw fel("undantag");
    if (!KATEGORIER.includes(o.kategori as Begrepp["kategori"])) throw fel("kategori");
    if (typeof o.granskad !== "boolean") throw fel("granskad");
    let kalla: Begrepp["kalla"];
    if (o.kalla !== undefined) {
      const k = o.kalla as Record<string, unknown> | null;
      if (typeof k !== "object" || k === null || !arStrang(k.namn) || (k.url !== undefined && !arStrang(k.url))) {
        throw fel("kalla");
      }
      kalla = k.url !== undefined ? { namn: k.namn, url: k.url as string } : { namn: k.namn };
    }
    const post: BegreppPost = {
      id: o.id, term: o.term, former: o.former as string[], kort: o.kort,
      kategori: o.kategori as Begrepp["kategori"], granskad: o.granskad,
    };
    if (o.lang !== undefined) post.lang = o.lang as string;
    if (kalla) post.kalla = kalla;
    if (o.se_aven !== undefined) post.se_aven = o.se_aven as string[];
    if (o.undantag !== undefined) post.undantag = o.undantag as string[];
    return post;
  });
}

/** Hela registret i filens ordning. */
export const BEGREPP: BegreppPost[] = tolkaRegister(data);

/** Slår upp ett begrepp på id. */
export function hittaBegrepp<T extends Begrepp>(reg: T[], id: string): T | undefined {
  return reg.find((b) => b.id === id);
}

/** Registret i svensk alfabetisk ordning efter term (Å, Ä och Ö sist). */
export function alfabetisk<T extends Begrepp>(reg: T[]): T[] {
  return [...reg].sort((a, b) => a.term.localeCompare(b.term, "sv"));
}

/** Elementets id för ett begrepp i begreppslistan (BegreppSida). */
export function ankareFor(id: string): string {
  return `begrepp-${id}`;
}
