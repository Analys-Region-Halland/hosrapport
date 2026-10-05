// rapport/publicering.ts: publiceringsdatum och period för en tidsupplösning ur
// manifestet (data/laddning.ts cachar det). Ägare: WP9.

import { useEffect, useState } from "react";
import { laddaManifest } from "../data/laddning";
import type { VyId } from "../data/modell";

/** Manifestets datum (ISO) för en vy, eller `givet` när föräldern redan vet det. */
export function usePubliceringsdatum(vy: VyId, givet?: string): string | undefined {
  const [svar, setSvar] = useState<{ vy: VyId; datum?: string } | null>(null);
  useEffect(() => {
    if (givet) return;
    let avbruten = false;
    laddaManifest().then(
      (m) => { if (!avbruten) setSvar({ vy, datum: m[vy]?.datum }); },
      () => { if (!avbruten) setSvar({ vy }); },
    );
    return () => { avbruten = true; };
  }, [vy, givet]);
  return givet ?? (svar?.vy === vy ? svar.datum : undefined);
}
