// ui/lager.ts: kroken useLager runt rapportens enda lagerstapel i nav/lager.ts,
// så att Escape stänger bara det översta lagret (stilguiden 4.5,
// docs/arkitektur.md 4.6). Ägare: WP4.
//
// Kroken registrerar exakt den funktion den får, utan att linda den, så att
// arOverst(stang) ur nav/lager.ts svarar för samma lager (klick utanför stänger
// bara det översta). Ge därför en stabil funktion (useCallback, eller en ref
// till den senaste): en ny funktion vid varje rendering tas ur stapeln och
// läggs överst igen.

import { useEffect } from "react";
import { registreraLager } from "../nav/lager";

/** Registrerar `stang` som lager så länge `oppen` är sant. */
export function useLager(oppen: boolean, stang: () => void): void {
  useEffect(() => {
    if (!oppen) return;
    return registreraLager(stang);
  }, [oppen, stang]);
}
