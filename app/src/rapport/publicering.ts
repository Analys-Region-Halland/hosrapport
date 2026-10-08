// rapport/publicering.ts: manifestets uppgifter om en tidsupplösning
// (publiceringsdatum, statusräkning per kapitel). data/laddning.ts cachar
// manifestet, så hooken kostar bara första gången. Ägare: WP9.

import { useEffect, useState } from "react";
import type { RaManifestVy } from "../data/kontrakt";
import { laddaManifest } from "../data/laddning";
import type { VyId } from "../data/modell";
import { datum } from "../design/format";
import type { UppdateringsFalt } from "../ui/Uppdatering";

/** Manifestets post för en vy. undefined medan manifestet laddas eller om det inte gick. */
export function useManifestVy(vy: VyId): RaManifestVy | undefined {
  const [svar, setSvar] = useState<{ vy: VyId; post?: RaManifestVy } | null>(null);
  useEffect(() => {
    let avbruten = false;
    laddaManifest().then(
      (m) => { if (!avbruten) setSvar({ vy, post: m[vy] }); },
      () => { if (!avbruten) setSvar({ vy }); },
    );
    return () => { avbruten = true; };
  }, [vy]);
  return svar?.vy === vy ? svar.post : undefined;
}

/**
 * Uppdateringsrutans fält för en vy: när rapporten uppdaterades (byggdatumet,
 * som följer publiceringen; vite.config.ts), vilken period den senaste datan
 * gäller och när nästa uppdatering väntas. På startsidan (`start`) gäller
 * periodfälten årsdatan, som de flesta kapitlen bygger på.
 */
export function uppdateringsFalt(post: RaManifestVy | undefined, start = false, byggdatum: string = __BUILD_DATE__): UppdateringsFalt[] {
  if (!post) return [];
  const falt: UppdateringsFalt[] = [{ etikett: start ? "Senast uppdaterad" : "Uppdaterad", varde: datum(byggdatum) }];
  if (post.period) falt.push({ etikett: start ? "Senaste årsdata" : "Senaste data", varde: post.period });
  if (post.nasta_period?.datum) falt.push({ etikett: "Nästa uppdatering", varde: datum(post.nasta_period.datum) });
  return falt;
}

/** Manifestets datum (ISO) för en vy, eller `givet` när föräldern redan vet det. */
export function usePubliceringsdatum(vy: VyId, givet?: string): string | undefined {
  const post = useManifestVy(vy);
  return givet ?? post?.datum;
}
