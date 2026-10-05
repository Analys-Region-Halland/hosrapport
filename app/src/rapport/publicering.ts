// rapport/publicering.ts: manifestets uppgifter om en tidsupplösning
// (publiceringsdatum, statusräkning per kapitel). data/laddning.ts cachar
// manifestet, så hooken kostar bara första gången. Ägare: WP9.

import { useEffect, useState } from "react";
import type { RaManifestVy } from "../data/kontrakt";
import { laddaManifest } from "../data/laddning";
import type { VyId } from "../data/modell";

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

/** Manifestets datum (ISO) för en vy, eller `givet` när föräldern redan vet det. */
export function usePubliceringsdatum(vy: VyId, givet?: string): string | undefined {
  const post = useManifestVy(vy);
  return givet ?? post?.datum;
}
