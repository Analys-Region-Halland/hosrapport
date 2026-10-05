// rapport/ramData.ts: data till ramen (kapitellista, innehållsförteckning,
// export, gamla ankare). Ägare: WP6.
//
// Manifest och kapitel laddas med data/laddning.ts (WP1), som normaliserar och
// cachar. Här finns bara det ramen lägger till: kapitellistan med vyer per
// kapitel, ett synkront uppslag bland redan laddade kapitel (för gamla ankare)
// och hooks för React.

import { useEffect, useState } from "react";
import type { RaManifest } from "../data/kontrakt";
import { laddaKapitel as wp1Kapitel, laddaManifest } from "../data/laddning";
import type { KapitelModell, VyId } from "../data/modell";
import { STANDARDVY, VYER } from "../nav/route";

export { laddaManifest };

const meddelande = (e: unknown) => (e instanceof Error ? e.message : String(e));

// Kapitel som redan är laddade, för synkront uppslag av gamla ankare.
const kapitelKlara = new Map<string, KapitelModell>();

/** data/laddning.ts laddaKapitel, plus att kapitlet minns för ankaruppslaget. */
export function laddaKapitel(vy: VyId, kapitelId: string): Promise<KapitelModell> {
  return wp1Kapitel(vy, kapitelId).then((k) => {
    kapitelKlara.set(`${vy}:${kapitelId}`, k);
    return k;
  });
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

/** Kapitel och vyer ur manifestet ({ [vy]: { period, sektioner: [{ id, namn }] } }). */
export function kapitelIndex(manifest: RaManifest): KapitelIndex {
  const ordning: VyId[] = [STANDARDVY, ...[...VYER].reverse().filter((v) => v !== STANDARDVY)];
  const poster = new Map<string, KapitelPost>();
  const period: KapitelIndex["period"] = {};
  for (const vy of ordning) {
    const m = manifest[vy];
    if (!m || !Array.isArray(m.sektioner)) continue;
    if (m.period) period[vy] = m.period;
    for (const s of m.sektioner) {
      if (!s?.id) continue;
      const post = poster.get(s.id) ?? { id: s.id, namn: s.namn || s.id, vyer: [] };
      post.vyer.push(vy);
      poster.set(s.id, post);
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
