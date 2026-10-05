// rapport/ramData.ts: data till ramen (kapitellista, innehållsförteckning,
// export). Ägare: WP6.
//
// Laddningen går via data/laddning.ts (WP1) med samma signatur. Så länge WP1:s
// laddning är en stubb ("Ej byggd") används en egen minimal läsning av dagens
// JSON (kontrakt v1) som bara fyller det ramen behöver: kapitlets namn,
// avsnitt, indikatorernas namn och status. När WP1 är sammanslagen tar dess
// normalisera över utan ändring här, och reservvägen kan tas bort.

import { useEffect, useState } from "react";
import type { RaManifest } from "../data/kontrakt";
import { laddaKapitel as wp1Kapitel, laddaManifest as wp1Manifest } from "../data/laddning";
import type { AvsnittModell, KallaRef, KapitelModell, KpiModell, Status, VyId } from "../data/modell";
import { STANDARDVY, VYER } from "../nav/route";

const ejByggd = (e: unknown) => e instanceof Error && e.message.startsWith("Ej byggd");
const meddelande = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ════════════════════════════════════════════════════════════
//  Laddning med samma signatur som data/laddning.ts
// ════════════════════════════════════════════════════════════

let manifestLofte: Promise<RaManifest> | null = null;
const kapitelLofte = new Map<string, Promise<KapitelModell>>();
const kapitelKlara = new Map<string, KapitelModell>();

async function hamtaJson(fil: string): Promise<unknown> {
  const r = await fetch(`${import.meta.env.BASE_URL}data/${fil}`);
  if (!r.ok) throw new Error(`Kunde inte hämta ${fil} (HTTP ${r.status})`);
  return r.json();
}

export function laddaManifest(): Promise<RaManifest> {
  if (!manifestLofte) {
    manifestLofte = (async () => {
      try {
        return await wp1Manifest();
      } catch (e) {
        if (!ejByggd(e)) throw e;
      }
      return (await hamtaJson("index.json")) as RaManifest;
    })();
    manifestLofte.catch(() => { manifestLofte = null; });
  }
  return manifestLofte;
}

export function laddaKapitel(vy: VyId, kapitelId: string): Promise<KapitelModell> {
  const nyckel = `${vy}:${kapitelId}`;
  let p = kapitelLofte.get(nyckel);
  if (!p) {
    p = (async () => {
      let k: KapitelModell;
      try {
        k = await wp1Kapitel(vy, kapitelId);
      } catch (e) {
        if (!ejByggd(e)) throw e;
        k = v1TillModell(await hamtaJson(`${vy}-${kapitelId}.json`));
      }
      kapitelKlara.set(nyckel, k);
      return k;
    })();
    p.catch(() => kapitelLofte.delete(nyckel));
    kapitelLofte.set(nyckel, p);
  }
  return p;
}

// ── Reserv: minimal läsning av kontrakt v1 ──

type Obj = Record<string, unknown>;
const obj = (x: unknown): Obj => (x && typeof x === "object" && !Array.isArray(x) ? (x as Obj) : {});
const lista = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const text = (x: unknown): string => (typeof x === "string" ? x : x == null ? "" : String(x));
const arStatus = (x: unknown): x is Status => x === "gron" || x === "gul" || x === "rod";

/** Reservläsning av en kapitelfil i kontrakt v1 (exporterad för tester). */
export function v1TillModell(raw: unknown): KapitelModell {
  const r = obj(raw);
  const kpier: KpiModell[] = lista(r.kpier).map((x) => {
    const k = obj(x);
    const utanMal = k.utan_mal === true;
    return {
      id: text(k.id),
      namn: text(k.namn),
      // Formatet används inte av ramen; WP1:s normalisera ger det rätta.
      format: { enhet: "procent", decimaler: 1, etikett: "%" },
      aggregering: "andel",
      riktning: utanMal ? "neutral" : k.inverterad === true ? "lag" : "hog",
      status: !utanMal && arStatus(k.status) ? k.status : null,
      fokus: "0013",
      serier: {},
      analystext: text(k.analystext),
      noter: [],
    };
  });
  const avsnitt: AvsnittModell[] = lista(r.delar).map((x) => {
    const d = obj(x);
    return { id: text(d.id), namn: text(d.namn), kpi_ids: lista(d.kpi_ids).map(text) };
  });
  const inledning = r.inledning;
  return {
    id: text(r.id),
    namn: text(r.namn),
    huvudpunkter: [],
    enheter: [],
    avsnitt,
    kpier,
    om_statistiken: Array.isArray(inledning) ? inledning.map(text) : inledning ? [text(inledning)] : [],
    kallor: lista(r.kallor) as KallaRef[],
    leverans: lista(r.leverans) as KallaRef[],
  };
}

// ════════════════════════════════════════════════════════════
//  Kapitellistan ur manifestet
// ════════════════════════════════════════════════════════════

export interface KapitelPost {
  id: string;
  namn: string;
  /** Vyer där kapitlet finns, i VYER-ordning. */
  vyer: VyId[];
}

export interface KapitelIndex {
  /** Kapitlen i rapportens ordning (årsvyns ordning först). */
  kapitel: KapitelPost[];
  /** Periodetikett per vy, t.ex. "2025" eller "Mars 2026". */
  period: Partial<Record<VyId, string>>;
}

/** Läser kapitel och vyer ur manifestet (v1: { [vy]: { period, sektioner: [{ id, namn }] } }). */
export function kapitelIndex(manifest: RaManifest): KapitelIndex {
  const ordning: VyId[] = [STANDARDVY, ...[...VYER].reverse().filter((v) => v !== STANDARDVY)];
  const poster = new Map<string, KapitelPost>();
  const period: KapitelIndex["period"] = {};
  for (const vy of ordning) {
    const m = obj((manifest as Obj)[vy]);
    if (!("sektioner" in m)) continue;
    if (m.period) period[vy] = text(m.period);
    for (const x of lista(m.sektioner)) {
      const s = obj(x);
      const id = text(s.id);
      if (!id) continue;
      const post = poster.get(id) ?? { id, namn: text(s.namn) || id, vyer: [] };
      post.vyer.push(vy);
      poster.set(id, post);
    }
  }
  const kapitel = [...poster.values()];
  for (const k of kapitel) k.vyer.sort((a, b) => VYER.indexOf(a) - VYER.indexOf(b));
  return { kapitel, period };
}

/** Vyn ett kapitel ska visas i: den önskade om kapitlet finns där, annars
 *  standardvyn, annars kapitlets första. undefined om kapitlet inte finns. */
export function vyForKapitel(index: KapitelIndex, id: string, onskad: VyId): VyId | undefined {
  const k = index.kapitel.find((x) => x.id === id);
  if (!k || k.vyer.length === 0) return undefined;
  if (k.vyer.includes(onskad)) return onskad;
  return k.vyer.includes(STANDARDVY) ? STANDARDVY : k.vyer[0];
}

/** Alla kapitel som finns i en vy, laddade. */
export async function laddaAllaKapitel(vy: VyId): Promise<KapitelModell[]> {
  const index = kapitelIndex(await laddaManifest());
  return Promise.all(index.kapitel.filter((k) => k.vyer.includes(vy)).map((k) => laddaKapitel(vy, k.id)));
}

// ── Gamla ankare: vilket kapitel ett block hör till ──

function innehaller(k: KapitelModell, blockId: string): boolean {
  return k.id === blockId || k.avsnitt.some((a) => a.id === blockId) || k.kpier.some((x) => x.id === blockId);
}

/** Synkront uppslag bland redan laddade kapitel (och kapitlens egna id:n). */
export function kapitelForBlockICache(index: KapitelIndex | null, blockId: string): string | undefined {
  if (index?.kapitel.some((k) => k.id === blockId)) return blockId;
  for (const k of kapitelKlara.values()) if (innehaller(k, blockId)) return k.id;
  return undefined;
}

/** Letar upp blockets kapitel genom att ladda kapitlen, årsvyn först. */
export async function hittaKapitelForBlock(index: KapitelIndex, blockId: string): Promise<string | undefined> {
  const snabb = kapitelForBlockICache(index, blockId);
  if (snabb) return snabb;
  const ordning: VyId[] = [STANDARDVY, ...VYER.filter((v) => v !== STANDARDVY)];
  for (const vy of ordning) {
    const kapitel = index.kapitel.filter((k) => k.vyer.includes(vy));
    const laddade = await Promise.all(kapitel.map((k) => laddaKapitel(vy, k.id).catch(() => null)));
    const traff = laddade.find((k) => k && innehaller(k, blockId));
    if (traff) return traff.id;
  }
  return undefined;
}

// ════════════════════════════════════════════════════════════
//  Hooks
// ════════════════════════════════════════════════════════════

/** Kapitellistan. null medan manifestet laddas. */
export function useKapitelIndex(): { index: KapitelIndex | null; fel: string | null } {
  const [res, setRes] = useState<{ index: KapitelIndex | null; fel: string | null }>({ index: null, fel: null });
  useEffect(() => {
    let avbruten = false;
    laddaManifest().then(
      (m) => { if (!avbruten) setRes({ index: kapitelIndex(m), fel: null }); },
      (e) => { if (!avbruten) setRes({ index: null, fel: meddelande(e) }); },
    );
    return () => { avbruten = true; };
  }, []);
  return res;
}

export interface KapitelLaddning {
  /** Kapitlet för adressen, eller samma kapitel i förra vyn medan nästa laddas. */
  kapitel: KapitelModell | null;
  /** Sant när kapitel är laddat för exakt den vy och det id som efterfrågas. */
  klar: boolean;
  fel: string | null;
}

/** Laddar ett kapitel. Vid vybyte visas förra vyns kapitel tills nästa är laddat. */
export function useKapitel(vy: VyId | null, id: string | null): KapitelLaddning {
  const nyckel = vy && id ? `${vy}:${id}` : null;
  const [res, setRes] = useState<{ nyckel: string; id: string; kapitel: KapitelModell | null; fel: string | null } | null>(null);
  useEffect(() => {
    if (!vy || !id) return;
    let avbruten = false;
    const n = `${vy}:${id}`;
    laddaKapitel(vy, id).then(
      (k) => { if (!avbruten) setRes({ nyckel: n, id, kapitel: k, fel: null }); },
      (e) => { if (!avbruten) setRes({ nyckel: n, id, kapitel: null, fel: meddelande(e) }); },
    );
    return () => { avbruten = true; };
  }, [vy, id]);
  if (!nyckel || !res) return { kapitel: null, klar: false, fel: null };
  const klar = res.nyckel === nyckel;
  return {
    kapitel: klar || res.id === id ? res.kapitel : null,
    klar,
    fel: klar ? res.fel : null,
  };
}

/** Alla kapitel i en vy (sammanfattningen). null medan de laddas. */
export function useAllaKapitel(vy: VyId | null): { kapitel: KapitelModell[] | null; fel: string | null } {
  const [res, setRes] = useState<{ vy: VyId; kapitel: KapitelModell[] | null; fel: string | null } | null>(null);
  useEffect(() => {
    if (!vy) return;
    let avbruten = false;
    laddaAllaKapitel(vy).then(
      (k) => { if (!avbruten) setRes({ vy, kapitel: k, fel: null }); },
      (e) => { if (!avbruten) setRes({ vy, kapitel: null, fel: meddelande(e) }); },
    );
    return () => { avbruten = true; };
  }, [vy]);
  return res && res.vy === vy ? { kapitel: res.kapitel, fel: res.fel } : { kapitel: null, fel: null };
}
