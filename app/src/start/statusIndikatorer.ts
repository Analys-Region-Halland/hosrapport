// start/statusIndikatorer.ts: vilka indikatorer som ligger bakom statusrutans
// siffror (startsidan och sammanfattningen). Tillägg 2026-10-08.
//
// Startsidan har bara manifestets räkning. Listorna som visas när man pekar på
// en kategori kräver kapitlen, så de hämtas i bakgrunden när sidan har ritats
// (data/laddning.ts cachar dem, så kapitlet öppnas sedan direkt). Tills de
// finns visar rutan siffrorna och skriver "Hämtar indikatorerna …" i listan.

import { useEffect, useState } from "react";
import { laddaKapitel } from "../data/laddning";
import type { KapitelModell, Status, VyId } from "../data/modell";
import { oversiktRader } from "../rapport/oversikt";

export interface StatusIndikator {
  kpiId: string;
  /** Indikatorns nummer i kapitlet, "2.3". */
  nummer: string;
  namn: string;
  status: Status;
  kapitelId: string;
  kapitelNamn: string;
  vy: VyId;
}

/** Kapitlets indikatorer med status, i kapitlets ordning. */
export function statusIndikatorer(kap: KapitelModell, vy: VyId): StatusIndikator[] {
  return oversiktRader(kap)
    .filter((r): r is typeof r & { status: Status } => r.status !== null)
    .map((r) => ({ kpiId: r.kpiId, nummer: r.nummer, namn: r.namn, status: r.status, kapitelId: kap.id, kapitelNamn: kap.namn, vy }));
}

/** Listorna per kapitel, hämtade i bakgrunden. Tom karta tills de finns. */
export function useStatusIndikatorer(kapitel: readonly { id: string; vy: VyId }[] | null): Map<string, StatusIndikator[]> {
  const [listor, setListor] = useState<Map<string, StatusIndikator[]>>(() => new Map());
  const nyckel = kapitel?.map((k) => `${k.vy}-${k.id}`).join(",") ?? "";
  useEffect(() => {
    if (!kapitel?.length) return;
    let avbruten = false;
    // Efter att sidan ritats, så att hämtningen inte konkurrerar med första bilden
    const start = setTimeout(() => {
      for (const k of kapitel) {
        laddaKapitel(k.vy, k.id).then(
          (kap) => {
            if (avbruten) return;
            setListor((m) => new Map(m).set(k.id, statusIndikatorer(kap, k.vy)));
          },
          () => { /* listan saknas; rutan visar bara siffrorna */ },
        );
      }
    }, 300);
    return () => { avbruten = true; clearTimeout(start); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nyckel]);
  return listor;
}
