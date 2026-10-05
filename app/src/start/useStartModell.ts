// start/useStartModell.ts: startsidans modell (startModell.ts) ur manifestet,
// för startsidan och sidan Om rapporten. Manifestet cachas av
// data/laddning.ts, så kroken kostar bara första gången. Ägare: WP11.

import { useEffect, useState } from "react";
import { TEMAN } from "../data/kapitelinfo";
import { laddaManifest } from "../data/laddning";
import { byggStartModell, type StartModell } from "./startModell";

/** Modellen, eller null medan manifestet laddas; fel när det inte gick. */
export function useStartModell(): { modell: StartModell | null; fel: string | null } {
  const [res, setRes] = useState<{ modell: StartModell | null; fel: string | null }>({ modell: null, fel: null });
  useEffect(() => {
    let avbruten = false;
    laddaManifest().then(
      (m) => { if (!avbruten) setRes({ modell: byggStartModell(m, TEMAN), fel: null }); },
      (e: unknown) => { if (!avbruten) setRes({ modell: null, fel: e instanceof Error ? e.message : String(e) }); },
    );
    return () => { avbruten = true; };
  }, []);
  return res;
}
