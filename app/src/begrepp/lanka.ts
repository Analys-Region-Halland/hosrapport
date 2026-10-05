// begrepp/lanka.ts: länkar begrepp i löptext (docs/arkitektur.md 4.5).
// Explicit [[id|text]] först, sedan längsta matchning, ordgränser med \p{L},
// skiftlägesokänsligt, bara första förekomsten per omfång. Ägare: WP5. Stubb från WP0.

import type { Begrepp } from "./register";

export function lankaBegrepp(_text: string, _reg: Begrepp[], _redan: Set<string>):
  (string | { id: string; text: string })[] {
  throw new Error("Ej byggd: WP5");
}
