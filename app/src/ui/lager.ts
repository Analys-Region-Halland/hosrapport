// ui/lager.ts: kroken useLager runt lagerstapeln i ui/lagerLokal.ts (WP5), så att
// Escape stänger bara det översta lagret (stilguiden 4.5, docs/arkitektur.md 4.6)
// och dialog, meny och popover delar en enda stapel. Ägare: WP4.
// När nav/lager.ts (WP6) finns byter lagerLokal sin kropp; den här filen behöver
// inte ändras.

import { useEffect, useEffectEvent } from "react";
import { arOverst, registreraLager } from "./lagerLokal";

export { arOverst, registreraLager };

/** Registrerar ett lager så länge `oppen` är sant. `stang` får bytas mellan renderingar. */
export function useLager(oppen: boolean, stang: () => void): void {
  const vidStang = useEffectEvent(stang);
  useEffect(() => {
    if (!oppen) return;
    return registreraLager(() => vidStang());
  }, [oppen]);
}
