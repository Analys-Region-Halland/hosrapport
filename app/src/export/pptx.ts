// export/pptx.ts: PowerPoint-export byggd på ChartSpec och tema.ts (stilguiden 6.9).
// Ersätter utils/pptx.ts. Ägare: WP12a. Stubb från WP0; signaturen är preliminär.

import type { KapitelModell, VyId } from "../data/modell";

export function exporteraPptx(_kapitel: KapitelModell[], _alt: { titel: string; vy: VyId; kicker?: string }): Promise<void> {
  throw new Error("Ej byggd: WP12a");
}
