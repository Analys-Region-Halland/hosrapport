// nav/useRoute.ts: aktuell adress och navigering med pushState/replaceState.
// Ägare: WP6. Stubb från WP0; signaturen är preliminär.

import type { Route } from "./route";

export function useRoute(): [Route, (till: Route, ersatt?: boolean) => void] {
  throw new Error("Ej byggd: WP6");
}
